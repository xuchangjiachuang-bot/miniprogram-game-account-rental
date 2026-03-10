/**
 * 订单超时处理服务
 * 自动取消超时未支付的订单
 */

import { db, orders, userBalances, balanceTransactions, platformSettings } from './db';
import { eq, and, lt, or } from 'drizzle-orm';

// ==================== 类型定义 ====================

export interface TimeoutCheckResult {
  success: boolean;
  message: string;
  cancelledCount: number;
}

// ==================== 订单超时处理核心功能 ====================

/**
 * 检查并取消超时订单
 *
 * @returns 处理结果
 */
export async function checkAndCancelTimeoutOrders(): Promise<TimeoutCheckResult> {
  try {
    // 1. 获取平台配置
    const settingsList = await db.select().from(platformSettings);
    const settings = settingsList[0] || {
      orderPaymentTimeout: 1800 // 默认30分钟
    };

    const timeoutSeconds = Number(settings.orderPaymentTimeout) || 1800;

    // 2. 计算超时时间
    const timeoutTime = new Date(Date.now() - timeoutSeconds * 1000);

    // 3. 查询超时未支付的订单
    const timeoutOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'pending_payment'),
          lt(orders.createdAt, timeoutTime.toISOString())
        )
      );

    if (timeoutOrders.length === 0) {
      return {
        success: true,
        message: '没有超时订单需要处理',
        cancelledCount: 0
      };
    }

    // 4. 批量取消超时订单
    let cancelledCount = 0;

    await db.transaction(async (tx) => {
      for (const order of timeoutOrders) {
        try {
          // 4.1 更新订单状态为已取消
          await tx
            .update(orders)
            .set({
              status: 'cancelled',
              updatedAt: new Date().toISOString()
            })
            .where(eq(orders.id, order.id));

          // 4.2 解冻买家押金（如果有冻结的话）
          const buyerBalances = await tx
            .select()
            .from(userBalances)
            .where(eq(userBalances.userId, order.buyerId));

          if (buyerBalances.length > 0) {
            const oldFrozen = Number(buyerBalances[0].frozenBalance) || 0;
            const oldAvailable = Number(buyerBalances[0].availableBalance) || 0;
            const depositAmount = Number(order.deposit) || 0;

            // 只有当冻结余额大于等于押金金额时才解冻
            if (oldFrozen >= depositAmount) {
              const newFrozen = oldFrozen - depositAmount;
              const newAvailable = oldAvailable + depositAmount;

              await tx
                .update(userBalances)
                .set({
                  frozenBalance: newFrozen.toString(),
                  availableBalance: newAvailable.toString(),
                  updatedAt: new Date().toISOString()
                })
                .where(eq(userBalances.userId, order.buyerId));

              // 记录余额变动
              await tx.insert(balanceTransactions).values({
                id: crypto.randomUUID(),
                userId: order.buyerId,
                orderId: order.id,
                transactionType: 'order_timeout_refund',
                amount: depositAmount.toString(),
                balanceBefore: oldAvailable.toString(),
                balanceAfter: newAvailable.toString(),
                description: `订单${order.orderNo}超时取消，押金退还`,
                createdAt: new Date().toISOString()
              });
            }
          }

          // 4.3 如果订单已经支付，需要退款
          if (order.status === 'paid' || order.paymentTime) {
            const paymentAmount = Number(order.totalPrice) || 0;

            const buyerBalances = await tx
              .select()
              .from(userBalances)
              .where(eq(userBalances.userId, order.buyerId));

            if (buyerBalances.length > 0) {
              const oldAvailable = Number(buyerBalances[0].availableBalance) || 0;
              const newAvailable = oldAvailable + paymentAmount;

              await tx
                .update(userBalances)
                .set({
                  availableBalance: newAvailable.toString(),
                  updatedAt: new Date().toISOString()
                })
                .where(eq(userBalances.userId, order.buyerId));

              // 记录余额变动
              await tx.insert(balanceTransactions).values({
                id: crypto.randomUUID(),
                userId: order.buyerId,
                orderId: order.id,
                transactionType: 'order_timeout_refund',
                amount: paymentAmount.toString(),
                balanceBefore: oldAvailable.toString(),
                balanceAfter: newAvailable.toString(),
                description: `订单${order.orderNo}超时取消，全额退款`,
                createdAt: new Date().toISOString()
              });
            }
          }

          cancelledCount++;
        } catch (error: any) {
          console.error(`取消订单 ${order.id} 失败:`, error);
          throw error;
        }
      }
    });

    return {
      success: true,
      message: `成功取消 ${cancelledCount} 个超时订单`,
      cancelledCount
    };
  } catch (error: any) {
    console.error('订单超时处理失败:', error);
    return {
      success: false,
      message: error.message || '订单超时处理失败',
      cancelledCount: 0
    };
  }
}

/**
 * 获取超时订单列表
 *
 * @returns 超时订单列表
 */
export async function getTimeoutOrders() {
  try {
    // 获取平台配置
    const settingsList = await db.select().from(platformSettings);
    const settings = settingsList[0] || {
      orderPaymentTimeout: 1800
    };

    const timeoutSeconds = Number(settings.orderPaymentTimeout) || 1800;
    const timeoutTime = new Date(Date.now() - timeoutSeconds * 1000);

    // 查询超时订单
    const timeoutOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'pending_payment'),
          lt(orders.createdAt, timeoutTime.toISOString())
        )
      );

    return {
      success: true,
      data: timeoutOrders,
      timeoutTime: timeoutTime.toISOString()
    };
  } catch (error: any) {
    console.error('获取超时订单失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 检查单个订单是否超时
 *
 * @param orderId 订单ID
 * @returns 是否超时
 */
export async function isOrderTimeout(orderId: string): Promise<boolean> {
  try {
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!orderList || orderList.length === 0) {
      return false;
    }

    const order = orderList[0];

    // 只有待支付状态的订单才会超时
    if (order.status !== 'pending_payment') {
      return false;
    }

    // 获取平台配置
    const settingsList = await db.select().from(platformSettings);
    const settings = settingsList[0] || {
      orderPaymentTimeout: 1800
    };

    const timeoutSeconds = Number(settings.orderPaymentTimeout) || 1800;
    const timeoutTime = new Date(Date.now() - timeoutSeconds * 1000);

    if (!order.createdAt) {
      return false;
    }

    const orderCreatedAt = new Date(order.createdAt);

    return orderCreatedAt < timeoutTime;
  } catch (error) {
    console.error('检查订单超时失败:', error);
    return false;
  }
}
