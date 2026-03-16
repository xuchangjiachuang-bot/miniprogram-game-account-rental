/**
 * 订单超时处理服务
 * 自动取消超时未支付的订单
 */

import { and, eq, lt } from 'drizzle-orm';
import { db, orders, userBalances, balanceTransactions, platformSettings } from './db';
import { restoreAccountAvailabilityIfNoBlockingOrders } from './account-service';

const DEFAULT_PAYMENT_TIMEOUT_SECONDS = 180;

export interface TimeoutCheckResult {
  success: boolean;
  message: string;
  cancelledCount: number;
}

export async function getPaymentTimeoutSeconds() {
  const settingsList = await db.select().from(platformSettings);
  const configuredValue = Number(settingsList[0]?.orderPaymentTimeout);

  if (Number.isFinite(configuredValue) && configuredValue > 0) {
    return configuredValue;
  }

  return DEFAULT_PAYMENT_TIMEOUT_SECONDS;
}

export async function checkAndCancelTimeoutOrders(): Promise<TimeoutCheckResult> {
  try {
    const timeoutSeconds = await getPaymentTimeoutSeconds();
    const timeoutTime = new Date(Date.now() - timeoutSeconds * 1000).toISOString();

    const timeoutOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.status, 'pending_payment'),
        lt(orders.createdAt, timeoutTime),
      ));

    if (timeoutOrders.length === 0) {
      return {
        success: true,
        message: '没有超时订单需要处理',
        cancelledCount: 0,
      };
    }

    let cancelledCount = 0;

    await db.transaction(async (tx) => {
      for (const order of timeoutOrders) {
        await tx
          .update(orders)
          .set({
            status: 'cancelled',
            updatedAt: new Date().toISOString(),
          })
          .where(eq(orders.id, order.id));

        const shouldRefundWallet = order.paymentMethod === 'wallet';
        const buyerBalances = shouldRefundWallet
          ? await tx
            .select()
            .from(userBalances)
            .where(eq(userBalances.userId, order.buyerId))
          : [];

        if (shouldRefundWallet && buyerBalances.length > 0) {
          const balance = buyerBalances[0];
          const oldFrozen = Number(balance.frozenBalance) || 0;
          const oldAvailable = Number(balance.availableBalance) || 0;
          const depositAmount = Number(order.deposit) || 0;

          if (oldFrozen >= depositAmount && depositAmount > 0) {
            const newFrozen = oldFrozen - depositAmount;
            const newAvailable = oldAvailable + depositAmount;

            await tx
              .update(userBalances)
              .set({
                frozenBalance: newFrozen.toString(),
                availableBalance: newAvailable.toString(),
                updatedAt: new Date().toISOString(),
              })
              .where(eq(userBalances.userId, order.buyerId));

            await tx.insert(balanceTransactions).values({
              id: crypto.randomUUID(),
              userId: order.buyerId,
              orderId: order.id,
              transactionType: 'order_timeout_refund',
              amount: depositAmount.toString(),
              balanceBefore: oldAvailable.toString(),
              balanceAfter: newAvailable.toString(),
              description: `订单${order.orderNo}超时取消，押金退回`,
              createdAt: new Date().toISOString(),
            });
          }
        }

        cancelledCount += 1;
      }
    });

    for (const order of timeoutOrders) {
      await restoreAccountAvailabilityIfNoBlockingOrders(order.accountId);
    }

    return {
      success: true,
      message: `成功取消 ${cancelledCount} 个超时订单`,
      cancelledCount,
    };
  } catch (error: any) {
    console.error('订单超时处理失败:', error);
    return {
      success: false,
      message: error.message || '订单超时处理失败',
      cancelledCount: 0,
    };
  }
}

export async function getTimeoutOrders() {
  try {
    const timeoutSeconds = await getPaymentTimeoutSeconds();
    const timeoutTime = new Date(Date.now() - timeoutSeconds * 1000).toISOString();

    const timeoutOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.status, 'pending_payment'),
        lt(orders.createdAt, timeoutTime),
      ));

    return {
      success: true,
      data: timeoutOrders,
      timeoutTime,
    };
  } catch (error: any) {
    console.error('获取超时订单失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function isOrderTimeout(orderId: string): Promise<boolean> {
  try {
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const order = orderList[0];

    if (!order || order.status !== 'pending_payment' || !order.createdAt) {
      return false;
    }

    const timeoutSeconds = await getPaymentTimeoutSeconds();
    const timeoutTime = Date.now() - timeoutSeconds * 1000;

    return new Date(order.createdAt).getTime() < timeoutTime;
  } catch (error) {
    console.error('检查订单超时失败:', error);
    return false;
  }
}
