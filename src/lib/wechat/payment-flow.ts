import { NextRequest } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { accounts, db, orders, paymentRecords } from '@/lib/db';
import { getServerToken } from '@/lib/server-auth';
import { User, verifyToken } from '@/lib/user-service';
import { fenToYuan } from '@/lib/wechat/utils';

export async function getAuthenticatedPaymentUser(request: NextRequest): Promise<User | null> {
  const token = getServerToken(request);
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export function getWechatNotifyBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
}

export function getRequestClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

export async function markWechatOrderPaid(params: {
  orderId: string;
  transactionId?: string | null;
  totalFeeFen?: number | null;
}) {
  const { orderId, transactionId, totalFeeFen } = params;
  const now = new Date().toISOString();

  return db.transaction(async (tx) => {
    const orderList = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderList.length === 0) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const order = orderList[0];
    const expectedAmount = Number(order.totalPrice || 0);

    if (typeof totalFeeFen === 'number') {
      const actualAmount = Number(fenToYuan(totalFeeFen));
      if (Math.abs(expectedAmount - actualAmount) > 0.01) {
        throw new Error('PAYMENT_AMOUNT_MISMATCH');
      }
    }

    if (order.status === 'paid') {
      return { order, alreadyPaid: true };
    }

    await tx
      .update(orders)
      .set({
        status: 'paid',
        paymentTime: now,
        paymentMethod: 'wechat',
        transactionId: transactionId || order.transactionId,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    const paymentRecordList = await tx
      .select({ id: paymentRecords.id })
      .from(paymentRecords)
      .where(and(
        eq(paymentRecords.orderId, order.id),
        eq(paymentRecords.type, 'payment'),
        eq(paymentRecords.method, 'wechat'),
      ))
      .limit(1);

    if (paymentRecordList.length === 0) {
      await tx.insert(paymentRecords).values({
        orderId: order.id,
        orderNo: order.orderNo,
        userId: order.buyerId,
        amount: typeof totalFeeFen === 'number' ? fenToYuan(totalFeeFen) : String(order.totalPrice),
        type: 'payment',
        method: 'wechat',
        transactionId: transactionId || order.transactionId || '',
        thirdPartyOrderId: order.id,
        status: 'success',
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .update(accounts)
      .set({
        status: 'rented',
        tradeCount: sql`${accounts.tradeCount} + 1`,
        updatedAt: now,
      })
      .where(and(
        eq(accounts.id, order.accountId),
        eq(accounts.status, 'available'),
      ));

    return { order, alreadyPaid: false };
  });
}
