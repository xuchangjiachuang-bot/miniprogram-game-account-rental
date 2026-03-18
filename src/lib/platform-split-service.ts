import { and, eq, sql } from 'drizzle-orm';
import {
  accounts,
  balanceTransactions,
  db,
  orders,
  platformSettings,
  splitRecords,
  userBalances,
} from './db';
import { getEffectiveCommissionRate } from './commission-activity-service';
import { safeLogFinanceAuditEvent } from './finance-audit-service';
import { getApprovedConsumptionSummary } from './order-consumption-service';

export interface SplitResult {
  success: boolean;
  message: string;
  platformCommission: number;
  sellerIncome: number;
  buyerRefund: number;
}

function buildSellerIncomeDescription(params: {
  orderNo: string;
  rentalPrice: number;
  commissionRate: number;
  platformCommission: number;
  depositDeductedAmount: number;
  sellerIncome: number;
}) {
  const parts = [
    `订单 ${params.orderNo} 租金到账`,
    `租金￥${params.rentalPrice.toFixed(2)}`,
    `平台服务费 ${params.commissionRate.toFixed(2)}% ￥${params.platformCommission.toFixed(2)}`,
  ];

  if (params.depositDeductedAmount > 0) {
    parts.push(`资源消耗赔付￥${params.depositDeductedAmount.toFixed(2)}`);
  }

  parts.push(`实际到账￥${params.sellerIncome.toFixed(2)}`);
  return parts.join('，');
}

export async function executeAutoSplit(orderId: string): Promise<SplitResult> {
  try {
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId));
    const order = orderList[0];

    if (!order) {
      return {
        success: false,
        message: '订单不存在',
        platformCommission: 0,
        sellerIncome: 0,
        buyerRefund: 0,
      };
    }

    if (order.status !== 'completed') {
      return {
        success: false,
        message: `订单状态不正确，当前状态：${order.status}`,
        platformCommission: 0,
        sellerIncome: 0,
        buyerRefund: 0,
      };
    }

    if (order.isSettled) {
      return {
        success: false,
        message: '订单已经结算',
        platformCommission: 0,
        sellerIncome: 0,
        buyerRefund: 0,
      };
    }

    const settingsList = await db.select().from(platformSettings);
    const settings = settingsList[0] || { commissionRate: 5 };

    const baseCommissionRate = Number(settings.commissionRate) || 5;
    const { effectiveRate: commissionRate } = await getEffectiveCommissionRate(baseCommissionRate);

    const rentalPrice = Number(order.rentalPrice) || 0;
    const deposit = Number(order.deposit) || 0;
    const consumptionSummary = await getApprovedConsumptionSummary(orderId);
    const depositDeductedAmount = consumptionSummary.depositDeductedAmount || 0;
    const platformCommission = rentalPrice * (commissionRate / 100);
    const sellerIncome = rentalPrice - platformCommission + depositDeductedAmount;
    const buyerRefund = order.paymentMethod === 'wallet'
      ? Math.max(0, deposit - depositDeductedAmount)
      : 0;

    await db.transaction(async (tx) => {
      const now = new Date().toISOString();

      await tx
        .update(orders)
        .set({
          platformFee: platformCommission.toString(),
          sellerIncome: sellerIncome.toString(),
          isSettled: true,
          settledAt: now,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId));

      await tx
        .update(accounts)
        .set({
          tradeCount: sql`${accounts.tradeCount} + 1`,
          updatedAt: now,
        })
        .where(eq(accounts.id, order.accountId));

      const sellerBalances = await tx
        .select()
        .from(userBalances)
        .where(eq(userBalances.userId, order.sellerId));

      if (sellerBalances.length > 0) {
        const oldBalance = Number(sellerBalances[0].availableBalance) || 0;
        const oldTotalEarned = Number(sellerBalances[0].totalEarned) || 0;
        const newBalance = oldBalance + sellerIncome;
        const newTotalEarned = oldTotalEarned + sellerIncome;

        await tx
          .update(userBalances)
          .set({
            availableBalance: newBalance.toFixed(2),
            totalEarned: newTotalEarned.toFixed(2),
            updatedAt: now,
          })
          .where(eq(userBalances.userId, order.sellerId));

        await tx.insert(balanceTransactions).values({
          id: crypto.randomUUID(),
          userId: order.sellerId,
          orderId,
          transactionType: 'rental_income',
          amount: sellerIncome.toFixed(2),
          balanceBefore: oldBalance.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: buildSellerIncomeDescription({
            orderNo: order.orderNo,
            rentalPrice,
            commissionRate,
            platformCommission,
            depositDeductedAmount,
            sellerIncome,
          }),
          createdAt: now,
        });

        await safeLogFinanceAuditEvent({
          eventType: 'order_split_seller_income',
          status: 'success',
          userId: order.sellerId,
          orderId,
          amount: sellerIncome,
          balanceBefore: oldBalance,
          balanceAfter: newBalance,
          details: {
            orderNo: order.orderNo,
            commissionRate,
            depositDeductedAmount,
          },
        }, tx);
      }

      const shouldHandleBuyerDeposit = order.paymentMethod === 'wallet' && deposit > 0;
      const buyerBalances = shouldHandleBuyerDeposit
        ? await tx
          .select()
          .from(userBalances)
          .where(eq(userBalances.userId, order.buyerId))
        : [];

      if (buyerBalances.length > 0) {
        const oldFrozen = Number(buyerBalances[0].frozenBalance) || 0;
        const oldAvailable = Number(buyerBalances[0].availableBalance) || 0;
        const releasedFrozen = Math.min(oldFrozen, deposit);
        const newFrozen = Math.max(0, oldFrozen - releasedFrozen);
        const newAvailable = oldAvailable + buyerRefund;

        await tx
          .update(userBalances)
          .set({
            frozenBalance: newFrozen.toFixed(2),
            availableBalance: newAvailable.toFixed(2),
            updatedAt: now,
          })
          .where(eq(userBalances.userId, order.buyerId));

        if (buyerRefund > 0) {
          await tx.insert(balanceTransactions).values({
            id: crypto.randomUUID(),
            userId: order.buyerId,
            orderId,
            transactionType: 'deposit_refund',
            amount: buyerRefund.toFixed(2),
            balanceBefore: oldAvailable.toFixed(2),
            balanceAfter: newAvailable.toFixed(2),
            description: `订单 ${order.orderNo} 押金退还`,
            createdAt: now,
          });
        }

        if (depositDeductedAmount > 0) {
          await tx.insert(balanceTransactions).values({
            id: crypto.randomUUID(),
            userId: order.buyerId,
            orderId,
            transactionType: 'deposit_consumption_deduction',
            amount: depositDeductedAmount.toFixed(2),
            balanceBefore: oldAvailable.toFixed(2),
            balanceAfter: oldAvailable.toFixed(2),
            description: `订单 ${order.orderNo} 资源消耗扣除押金￥${depositDeductedAmount.toFixed(2)}`,
            createdAt: now,
          });
        }

        await safeLogFinanceAuditEvent({
          eventType: 'order_split_buyer_deposit_refund',
          status: 'success',
          userId: order.buyerId,
          orderId,
          amount: buyerRefund,
          balanceBefore: oldAvailable,
          balanceAfter: newAvailable,
          details: {
            orderNo: order.orderNo,
            releasedFrozen,
            depositDeductedAmount,
          },
        }, tx);
      }

      if (depositDeductedAmount > 0) {
        await tx.insert(splitRecords).values({
          id: crypto.randomUUID(),
          orderId,
          orderNo: order.orderNo,
          receiverType: 'seller',
          receiverId: order.sellerId,
          receiverName: '卖家',
          splitAmount: depositDeductedAmount.toFixed(2),
          splitRatio: '100.00',
          commissionType: 'consumption_deduction',
          status: 'success',
          splitTime: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      await tx.insert(splitRecords).values({
        id: crypto.randomUUID(),
        orderId,
        orderNo: order.orderNo,
        receiverType: 'seller',
        receiverId: order.sellerId,
        receiverName: '卖家',
        splitAmount: sellerIncome.toFixed(2),
        splitRatio: rentalPrice > 0 ? ((sellerIncome / rentalPrice) * 100).toFixed(2) : '0.00',
        commissionType: 'rental_income',
        status: 'success',
        splitTime: now,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(splitRecords).values({
        id: crypto.randomUUID(),
        orderId,
        orderNo: order.orderNo,
        receiverType: 'platform',
        receiverId: 'platform',
        receiverName: '平台',
        splitAmount: platformCommission.toFixed(2),
        splitRatio: commissionRate.toFixed(2),
        commissionType: 'platform_fee',
        status: 'success',
        splitTime: now,
        createdAt: now,
        updatedAt: now,
      });

      if (buyerRefund > 0) {
        await tx.insert(splitRecords).values({
          id: crypto.randomUUID(),
          orderId,
          orderNo: order.orderNo,
          receiverType: 'buyer',
          receiverId: order.buyerId,
          receiverName: '买家',
          splitAmount: buyerRefund.toFixed(2),
          splitRatio: '100.00',
          commissionType: 'deposit_refund',
          status: 'success',
          splitTime: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      await safeLogFinanceAuditEvent({
        eventType: 'order_split_completed',
        status: 'success',
        orderId,
        amount: rentalPrice,
        details: {
          orderNo: order.orderNo,
          platformCommission,
          sellerIncome,
          buyerRefund,
          depositDeductedAmount,
          paymentMethod: order.paymentMethod || null,
        },
      }, tx);
    });

    return {
      success: true,
      message: '结算成功',
      platformCommission,
      sellerIncome,
      buyerRefund,
    };
  } catch (error: any) {
    console.error('执行结算失败:', error);
    return {
      success: false,
      message: error.message || '结算失败',
      platformCommission: 0,
      sellerIncome: 0,
      buyerRefund: 0,
    };
  }
}

export async function getSplitStatus(orderId: string) {
  try {
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId));
    const order = orderList[0];

    if (!order) {
      return {
        success: false,
        message: '订单不存在',
      };
    }

    const splitRecordsList = await db
      .select()
      .from(splitRecords)
      .where(eq(splitRecords.orderId, orderId));

    return {
      success: true,
      isSettled: order.isSettled,
      settledAt: order.settledAt,
      platformFee: order.platformFee,
      sellerIncome: order.sellerIncome,
      splits: splitRecordsList,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '查询结算状态失败',
    };
  }
}
