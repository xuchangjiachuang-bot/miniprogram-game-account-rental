/**
 * 平台自建分账服务
 * 订单完成时自动触发分账，将卖家应得金额计入余额
 */

import { db, orders, userBalances, balanceTransactions, splitRecords, platformSettings } from './db';
import { eq, and } from 'drizzle-orm';

// ==================== 类型定义 ====================

export interface SplitResult {
  success: boolean;
  message: string;
  platformCommission: number;
  sellerIncome: number;
  buyerRefund: number;
}

// ==================== 平台分账核心功能 ====================

/**
 * 执行订单平台分账
 *
 * 说明：平台自建分账系统，不分账到微信，而是记录卖家应得金额到余额
 *
 * @param orderId 订单ID
 * @returns 分账结果
 */
export async function executeAutoSplit(orderId: string): Promise<SplitResult> {
  try {
    // 1. 获取订单信息
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!orderList || orderList.length === 0) {
      return {
        success: false,
        message: '订单不存在',
        platformCommission: 0,
        sellerIncome: 0,
        buyerRefund: 0
      };
    }

    const order = orderList[0];

    // 检查订单状态是否为已完成
    if (order.status !== 'completed') {
      return {
        success: false,
        message: `订单状态不正确，当前状态：${order.status}`,
        platformCommission: 0,
        sellerIncome: 0,
        buyerRefund: 0
      };
    }

    // 检查是否已经分账
    if (order.isSettled) {
      return {
        success: false,
        message: '订单已经分账',
        platformCommission: 0,
        sellerIncome: 0,
        buyerRefund: 0
      };
    }

    // 2. 获取平台配置
    const settingsList = await db.select().from(platformSettings);
    const settings = settingsList[0] || {
      commissionRate: 5
    };

    const commissionRate = Number(settings.commissionRate) || 5;

    // 3. 计算分账金额
    const rentalPrice = Number(order.rentalPrice) || 0;
    const deposit = Number(order.deposit) || 0;

    // 平台佣金 = 租金 * 佣金比例
    const platformCommission = rentalPrice * (commissionRate / 100);

    // 卖家收入 = 租金 - 平台佣金
    const sellerIncome = rentalPrice - platformCommission;

    // 买家押金退款
    const buyerRefund = deposit;

    // 4. 开始事务
    await db.transaction(async (tx) => {
      // 4.1 更新订单分账信息
      await tx
        .update(orders)
        .set({
          platformFee: platformCommission.toString(),
          sellerIncome: sellerIncome.toString(),
          isSettled: true,
          settledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(orders.id, orderId));

      // 4.2 增加卖家可用余额
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
            availableBalance: newBalance.toString(),
            totalEarned: newTotalEarned.toString(),
            updatedAt: new Date().toISOString()
          })
          .where(eq(userBalances.userId, order.sellerId));

        // 记录卖家余额变动
        await tx.insert(balanceTransactions).values({
          id: crypto.randomUUID(),
          userId: order.sellerId,
          orderId: orderId,
          transactionType: 'rental_income',
          amount: sellerIncome.toString(),
          balanceBefore: oldBalance.toString(),
          balanceAfter: newBalance.toString(),
          description: `订单${order.orderNo}租金收入，净收入￥${sellerIncome.toFixed(2)}`,
          createdAt: new Date().toISOString()
        });
      }

      // 4.3 解冻并退还买家押金
      const buyerBalances = await tx
        .select()
        .from(userBalances)
        .where(eq(userBalances.userId, order.buyerId));

      if (buyerBalances.length > 0) {
        const oldFrozen = Number(buyerBalances[0].frozenBalance) || 0;
        const oldAvailable = Number(buyerBalances[0].availableBalance) || 0;
        const releasedFrozen = Math.min(oldFrozen, buyerRefund);
        const newFrozen = Math.max(0, oldFrozen - releasedFrozen);
        const newAvailable = oldAvailable + buyerRefund;

        await tx
          .update(userBalances)
          .set({
            frozenBalance: newFrozen.toString(),
            availableBalance: newAvailable.toString(),
            updatedAt: new Date().toISOString()
          })
          .where(eq(userBalances.userId, order.buyerId));

        // 记录买家余额变动
        await tx.insert(balanceTransactions).values({
          id: crypto.randomUUID(),
          userId: order.buyerId,
          orderId: orderId,
          transactionType: 'deposit_refund',
          amount: buyerRefund.toString(),
          balanceBefore: oldAvailable.toString(),
          balanceAfter: newAvailable.toString(),
          description: `订单${order.orderNo}押金退还`,
          createdAt: new Date().toISOString()
        });
      }

      // 4.4 记录分账记录 - 卖家
      await tx.insert(splitRecords).values({
        id: crypto.randomUUID(),
        orderId: orderId,
        orderNo: order.orderNo,
        receiverType: 'seller',
        receiverId: order.sellerId,
        receiverName: '卖家',
        splitAmount: sellerIncome.toString(),
        splitRatio: ((sellerIncome / rentalPrice) * 100).toString(),
        commissionType: 'rental_income',
        status: 'success',
        splitTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4.5 记录分账记录 - 平台佣金
      await tx.insert(splitRecords).values({
        id: crypto.randomUUID(),
        orderId: orderId,
        orderNo: order.orderNo,
        receiverType: 'platform',
        receiverId: 'platform',
        receiverName: '平台',
        splitAmount: platformCommission.toString(),
        splitRatio: commissionRate.toString(),
        commissionType: 'platform_fee',
        status: 'success',
        splitTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    return {
      success: true,
      message: '分账成功',
      platformCommission,
      sellerIncome,
      buyerRefund
    };
  } catch (error: any) {
    console.error('执行分账失败:', error);
    return {
      success: false,
      message: error.message || '分账失败',
      platformCommission: 0,
      sellerIncome: 0,
      buyerRefund: 0
    };
  }
}

/**
 * 查询订单分账状态
 *
 * @param orderId 订单ID
 * @returns 分账状态
 */
export async function getSplitStatus(orderId: string) {
  try {
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!orderList || orderList.length === 0) {
      return {
        success: false,
        message: '订单不存在'
      };
    }

    const order = orderList[0];

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
      splits: splitRecordsList
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '查询分账状态失败'
    };
  }
}
