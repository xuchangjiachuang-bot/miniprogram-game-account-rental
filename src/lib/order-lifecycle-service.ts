import { and, eq, lt } from 'drizzle-orm';
import { db, orders } from '@/lib/db';
import { settleCompletedOrder } from '@/lib/order-settlement-service';

async function moveOrderToPendingVerification(orderId: string, now: string) {
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await db
    .update(orders)
    .set({
      status: 'pending_verification',
      actualEndTime: now,
      verificationRequestTime: now,
      verificationDeadline: deadline,
      verificationResult: 'pending',
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  return {
    transitioned: true,
    nextStatus: 'pending_verification' as const,
    verificationDeadline: deadline,
  };
}

async function autoCompleteVerifiedOrder(orderId: string, now: string) {
  await db
    .update(orders)
    .set({
      status: 'completed',
      verificationResult: 'passed',
      verificationRemark: '超时自动验号通过',
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  const splitResult = await settleCompletedOrder(orderId);
  if (!splitResult.success) {
    throw new Error(splitResult.message);
  }

  return {
    transitioned: true,
    nextStatus: 'completed' as const,
  };
}

export async function syncSingleOrderLifecycle(orderId: string) {
  const now = new Date().toISOString();
  const orderList = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (orderList.length === 0) {
    return null;
  }

  const order = orderList[0];

  if (order.status === 'active' && order.endTime && order.endTime < now) {
    await moveOrderToPendingVerification(order.id, now);
  } else if (
    order.status === 'pending_verification'
    && order.verificationDeadline
    && order.verificationDeadline < now
  ) {
    await autoCompleteVerifiedOrder(order.id, now);
  }

  const refreshedOrderList = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  return refreshedOrderList[0] || order;
}

export async function syncExpiredOrders() {
  const now = new Date().toISOString();

  const expiredActiveOrders = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
    })
    .from(orders)
    .where(and(
      eq(orders.status, 'active'),
      lt(orders.endTime, now),
    ));

  const timedOutVerificationOrders = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
    })
    .from(orders)
    .where(and(
      eq(orders.status, 'pending_verification'),
      lt(orders.verificationDeadline, now),
    ));

  let expiredActiveCount = 0;
  let autoVerifiedCount = 0;
  let failedCount = 0;
  const errors: Array<{ orderNo: string; error: string }> = [];

  for (const order of expiredActiveOrders) {
    try {
      await moveOrderToPendingVerification(order.id, now);
      expiredActiveCount++;
    } catch (error: any) {
      failedCount++;
      errors.push({
        orderNo: order.orderNo,
        error: error.message || '未知错误',
      });
    }
  }

  for (const order of timedOutVerificationOrders) {
    try {
      await autoCompleteVerifiedOrder(order.id, now);
      autoVerifiedCount++;
    } catch (error: any) {
      failedCount++;
      errors.push({
        orderNo: order.orderNo,
        error: error.message || '未知错误',
      });
    }
  }

  return {
    expiredActiveCount,
    autoVerifiedCount,
    failedCount,
    errors,
  };
}
