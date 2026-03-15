/**
 * 自动分账服务
 * 订单完成时自动触发分账，记录分账信息到数据库
 */

import { db, orders, userBalances, balanceTransactions, splitRecords, platformSettings } from './db';
import { eq, and } from 'drizzle-orm';
import { getEffectiveCommissionRate } from './commission-activity-service';

// ==================== 类型定义 ====================

export interface SplitResult {
  success: boolean;
  message: string;
  platformCommission: number;
  sellerIncome: number;
  buyerRefund: number;
}

// ==================== 自动分账核心功能 ====================

/**
 * 执行订单自动分账
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
    const existingSplits = await db
      .select()
      .from(splitRecords)
      .where(eq(splitRecords.orderId, orderId));

    if (existingSplits && existingSplits.length > 0) {
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
      commissionRate: 5,
      withdrawalFee: 1
    };

    const baseCommissionRate = Number(settings.commissionRate) || 5;
    const withdrawalFeeRate = Number(settings.withdrawalFee) || 1;
    const { effectiveRate: commissionRate } = await getEffectiveCommissionRate(baseCommissionRate);

    // 3. 计算分账金额
    const rentalPrice = Number(order.rentalPrice) || 0;
    const deposit = Number(order.deposit) || 0;
    const totalPrice = Number(order.totalPrice) || 0;

    // 平台佣金 = 租金 * 佣金比例
    const platformCommission = rentalPrice * (commissionRate / 100);

    // 卖家收入 = 租金 - 平台佣金
    const sellerGrossIncome = rentalPrice - platformCommission;

    // 卖家净收入 = 卖家收入 - 提现手续费
    const withdrawalFee = sellerGrossIncome * (withdrawalFeeRate / 100);
    const sellerNetIncome = sellerGrossIncome - withdrawalFee;

    // 买家押金退款
    const buyerRefund = deposit;

    // 4. 开始事务
    await db.transaction(async (tx) => {
      // 4.1 更新订单分账信息
      await tx
        .update(orders)
        .set({
          platformCommission: platformCommission.toString(),
          withdrawalFee: withdrawalFee.toString(),
          sellerIncome: sellerNetIncome.toString(),
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
        const newBalance = oldBalance + sellerNetIncome;

        await tx
          .update(userBalances)
          .set({
            availableBalance: newBalance.toString(),
            totalEarned: (Number(sellerBalances[0].totalEarned) + sellerNetIncome).toString(),
            updatedAt: new Date().toISOString()
          })
          .where(eq(userBalances.userId, order.sellerId));

        // 记录卖家余额变动
        await tx.insert(balanceTransactions).values({
          id: crypto.randomUUID(),
          userId: order.sellerId,
          orderId: orderId,
          transactionType: 'rental_income',
          amount: sellerNetIncome.toString(),
          balanceBefore: oldBalance.toString(),
          balanceAfter: newBalance.toString(),
          description: `订单${order.orderNo}租金收入，净收入￥${sellerNetIncome.toFixed(2)}`,
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
        const newFrozen = oldFrozen - buyerRefund;
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
        splitAmount: sellerNetIncome.toString(),
        splitRatio: ((sellerNetIncome / totalPrice) * 100).toString(),
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
        receiverId: 'PLATFORM',
        receiverName: '平台',
        splitAmount: platformCommission.toString(),
        splitRatio: ((platformCommission / totalPrice) * 100).toString(),
        commissionType: 'platform_commission',
        status: 'success',
        splitTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4.6 记录分账记录 - 买家押金
      await tx.insert(splitRecords).values({
        id: crypto.randomUUID(),
        orderId: orderId,
        orderNo: order.orderNo,
        receiverType: 'buyer',
        receiverId: order.buyerId,
        receiverName: '买家',
        splitAmount: buyerRefund.toString(),
        splitRatio: ((buyerRefund / totalPrice) * 100).toString(),
        commissionType: 'deposit_refund',
        status: 'success',
        splitTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    return {
      success: true,
      message: '自动分账成功',
      platformCommission,
      sellerIncome: sellerNetIncome,
      buyerRefund
    };
  } catch (error: any) {
    console.error('自动分账失败:', error);
    return {
      success: false,
      message: error.message || '自动分账失败',
      platformCommission: 0,
      sellerIncome: 0,
      buyerRefund: 0
    };
  }
}

/**
 * 批量处理待分账订单
 * 用于定时任务或手动触发
 *
 * @returns 处理结果
 */
export async function processPendingSplits(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  try {
    // 查询所有已完成但未分账的订单
    const completedOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'completed'));

    for (const order of completedOrders) {
      // 检查是否已经分账
      const existingSplits = await db
        .select()
        .from(splitRecords)
        .where(eq(splitRecords.orderId, order.id));

      if (existingSplits.length === 0) {
        const result = await executeAutoSplit(order.id);
        if (result.success) {
          success++;
        } else {
          failed++;
          console.error(`订单 ${order.id} 分账失败: ${result.message}`);
        }
      }
    }
  } catch (error: any) {
    console.error('批量处理分账失败:', error);
  }

  return { success, failed };
}

/**
 * 获取订单分账记录
 *
 * @param orderId 订单ID
 * @returns 分账记录
 */
export async function getOrderSplitRecords(orderId: string) {
  try {
    const records = await db
      .select()
      .from(splitRecords)
      .where(eq(splitRecords.orderId, orderId));

    return {
      success: true,
      data: records
    };
  } catch (error: any) {
    console.error('获取分账记录失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
