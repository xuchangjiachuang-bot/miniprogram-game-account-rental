import { eq, sql } from 'drizzle-orm';
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
import { lockOrderFinanceScope } from './finance-lock-service';
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
    `Order ${params.orderNo} rental settlement`,
    `rental ${params.rentalPrice.toFixed(2)}`,
    `platform fee ${params.commissionRate.toFixed(2)}% = ${params.platformCommission.toFixed(2)}`,
  ];

  if (params.depositDeductedAmount > 0) {
    parts.push(`consumption deduction ${params.depositDeductedAmount.toFixed(2)}`);
  }

  parts.push(`net income ${params.sellerIncome.toFixed(2)}`);
  return parts.join(', ');
}

export async function executeAutoSplit(orderId: string): Promise<SplitResult> {
  try {
    return await db.transaction(async (tx) => {
      await lockOrderFinanceScope(
        tx as unknown as { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
        orderId,
      );

      const orderList = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      const order = orderList[0];

      if (!order) {
        return {
          success: false,
          message: 'ORDER_NOT_FOUND',
          platformCommission: 0,
          sellerIncome: 0,
          buyerRefund: 0,
        };
      }

      if (order.status !== 'completed') {
        return {
          success: false,
          message: `ORDER_STATUS_INVALID:${order.status}`,
          platformCommission: 0,
          sellerIncome: 0,
          buyerRefund: 0,
        };
      }

      if (order.isSettled) {
        return {
          success: true,
          message: 'ORDER_ALREADY_SETTLED',
          platformCommission: Number(order.platformFee) || 0,
          sellerIncome: Number(order.sellerIncome) || 0,
          buyerRefund: Number(order.deposit || 0),
        };
      }

      const settingsList = await tx.select().from(platformSettings);
      const settings = settingsList[0] || { commissionRate: 5 };
      const baseCommissionRate = Number(settings.commissionRate) || 5;
      const { effectiveRate: commissionRate } = await getEffectiveCommissionRate(baseCommissionRate);

      const rentalPrice = Number(order.rentalPrice) || 0;
      const deposit = Number(order.deposit) || 0;
      const consumptionSummary = await getApprovedConsumptionSummary(orderId);
      const depositDeductedAmount = consumptionSummary.depositDeductedAmount || 0;
      const platformCommission = rentalPrice * (commissionRate / 100);
      const sellerIncome = rentalPrice - platformCommission + depositDeductedAmount;
      const buyerRefund = Math.max(0, deposit - depositDeductedAmount);
      const now = new Date().toISOString();

      await tx
        .update(orders)
        .set({
          platformFee: platformCommission.toFixed(2),
          sellerIncome: sellerIncome.toFixed(2),
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

      await tx
        .insert(userBalances)
        .values({
          id: crypto.randomUUID(),
          userId: order.sellerId,
          availableBalance: '0',
          frozenBalance: '0',
          totalWithdrawn: '0',
          totalEarned: '0',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: userBalances.userId });

      const sellerBalanceRows = await tx
        .update(userBalances)
        .set({
          availableBalance: sql`${userBalances.availableBalance} + ${sellerIncome.toFixed(2)}`,
          totalEarned: sql`${userBalances.totalEarned} + ${sellerIncome.toFixed(2)}`,
          updatedAt: now,
        })
        .where(eq(userBalances.userId, order.sellerId))
        .returning({
          availableBalance: userBalances.availableBalance,
        });

      if (sellerBalanceRows.length === 0) {
        throw new Error('SELLER_BALANCE_NOT_FOUND');
      }

      const sellerBalanceAfter = Number(sellerBalanceRows[0].availableBalance || 0);
      const sellerBalanceBefore = sellerBalanceAfter - sellerIncome;

      await tx.insert(balanceTransactions).values({
        id: crypto.randomUUID(),
        userId: order.sellerId,
        orderId,
        transactionType: 'rental_income',
        amount: sellerIncome.toFixed(2),
        balanceBefore: sellerBalanceBefore.toFixed(2),
        balanceAfter: sellerBalanceAfter.toFixed(2),
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
        balanceBefore: sellerBalanceBefore,
        balanceAfter: sellerBalanceAfter,
        details: {
          orderNo: order.orderNo,
          commissionRate,
          depositDeductedAmount,
        },
      }, tx);

      if (deposit > 0) {
        await tx
          .insert(userBalances)
          .values({
            id: crypto.randomUUID(),
            userId: order.buyerId,
            availableBalance: '0',
            frozenBalance: '0',
            totalWithdrawn: '0',
            totalEarned: '0',
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: userBalances.userId });

        const buyerBalanceRows = await tx
          .update(userBalances)
          .set({
            frozenBalance: sql`GREATEST(${userBalances.frozenBalance} - ${deposit.toFixed(2)}, 0)`,
            availableBalance: sql`${userBalances.availableBalance} + ${buyerRefund.toFixed(2)}`,
            updatedAt: now,
          })
          .where(eq(userBalances.userId, order.buyerId))
          .returning({
            availableBalance: userBalances.availableBalance,
            frozenBalance: userBalances.frozenBalance,
          });

        if (buyerBalanceRows.length === 0) {
          throw new Error('BUYER_BALANCE_NOT_FOUND');
        }

        const buyerAvailableAfter = Number(buyerBalanceRows[0].availableBalance || 0);
        const buyerAvailableBefore = buyerAvailableAfter - buyerRefund;

        if (buyerRefund > 0) {
          await tx.insert(balanceTransactions).values({
            id: crypto.randomUUID(),
            userId: order.buyerId,
            orderId,
            transactionType: 'deposit_refund',
            amount: buyerRefund.toFixed(2),
            balanceBefore: buyerAvailableBefore.toFixed(2),
            balanceAfter: buyerAvailableAfter.toFixed(2),
            description: `Order ${order.orderNo} deposit refund`,
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
            balanceBefore: buyerAvailableAfter.toFixed(2),
            balanceAfter: buyerAvailableAfter.toFixed(2),
            description: `Order ${order.orderNo} consumption deduction ${depositDeductedAmount.toFixed(2)}`,
            createdAt: now,
          });
        }

        await safeLogFinanceAuditEvent({
          eventType: 'order_split_buyer_deposit_refund',
          status: 'success',
          userId: order.buyerId,
          orderId,
          amount: buyerRefund,
          balanceBefore: buyerAvailableBefore,
          balanceAfter: buyerAvailableAfter,
          details: {
            orderNo: order.orderNo,
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
          receiverName: 'seller',
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
        receiverName: 'seller',
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
        receiverName: 'platform',
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
          receiverName: 'buyer',
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

      return {
        success: true,
        message: 'SETTLEMENT_SUCCESS',
        platformCommission,
        sellerIncome,
        buyerRefund,
      };
    });
  } catch (error: any) {
    console.error('executeAutoSplit failed:', error);
    return {
      success: false,
      message: error.message || 'SETTLEMENT_FAILED',
      platformCommission: 0,
      sellerIncome: 0,
      buyerRefund: 0,
    };
  }
}

export async function getSplitStatus(orderId: string) {
  try {
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const order = orderList[0];

    if (!order) {
      return {
        success: false,
        message: 'ORDER_NOT_FOUND',
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
      message: error.message || 'GET_SPLIT_STATUS_FAILED',
    };
  }
}
