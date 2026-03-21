import { NextRequest } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { accounts, balanceTransactions, db, orders, paymentRecords, userBalances } from '@/lib/db';
import { safeLogFinanceAuditEvent } from '@/lib/finance-audit-service';
import { sendOrderPaidNotification } from '@/lib/notification-service';
import { ensureOrderGroupChat } from '@/lib/chat-service-new';
import { getServerToken } from '@/lib/server-auth';
import { User, verifyToken } from '@/lib/user-service';
import { notifySellerAfterOrderPaid } from '@/lib/seller-order-reminder-service';
import { fenToYuan } from '@/lib/wechat/utils';
import { queryTransactionByOutTradeNo } from '@/lib/wechat/v3';

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

  const result = await db.transaction(async (tx) => {
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

    if (['paid', 'active', 'pending_verification', 'pending_consumption_confirm', 'completed'].includes(order.status || '')) {
      return { order, alreadyPaid: true };
    }

    const rentalHours = Number(order.rentalDuration) || 24;
    const endTime = new Date(Date.now() + rentalHours * 60 * 60 * 1000).toISOString();

    await tx
      .update(orders)
      .set({
        status: 'active',
        paymentTime: now,
        paymentMethod: 'wechat',
        transactionId: transactionId || order.transactionId,
        startTime: now,
        endTime,
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
        thirdPartyOrderId: order.id.replace(/-/g, ''),
        status: 'success',
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .update(accounts)
      .set({
        status: 'rented',
        updatedAt: now,
      })
      .where(and(
        eq(accounts.id, order.accountId),
        eq(accounts.status, 'available'),
      ));

    await safeLogFinanceAuditEvent({
      eventType: 'order_payment_wechat_paid',
      status: 'success',
      userId: order.buyerId,
      orderId: order.id,
      amount: typeof totalFeeFen === 'number' ? fenToYuan(totalFeeFen) : String(order.totalPrice),
      details: {
        orderNo: order.orderNo,
        transactionId: transactionId || order.transactionId || '',
        paymentMethod: 'wechat',
      },
    }, tx);

    return { order, alreadyPaid: false };
  });

  if (!result.alreadyPaid) {
    await sendOrderPaidNotification(result.order.id, false);
    await notifySellerAfterOrderPaid(result.order.id);
  }

  return result;
}

export async function markWechatWalletRechargePaid(params: {
  outTradeNo: string;
  transactionId?: string | null;
  totalFeeFen?: number | null;
}) {
  const { outTradeNo, transactionId, totalFeeFen } = params;
  const now = new Date().toISOString();

  return db.transaction(async (tx) => {
    const paymentRecordList = await tx
      .select()
      .from(paymentRecords)
      .where(and(
        eq(paymentRecords.thirdPartyOrderId, outTradeNo),
        eq(paymentRecords.type, 'recharge'),
        eq(paymentRecords.method, 'wechat'),
      ))
      .limit(1);

    if (paymentRecordList.length === 0) {
      throw new Error('RECHARGE_RECORD_NOT_FOUND');
    }

    const paymentRecord = paymentRecordList[0];
    if (paymentRecord.status === 'success') {
      return { paymentRecord, alreadyPaid: true };
    }

    const expectedAmount = Number(paymentRecord.amount || 0);
    if (typeof totalFeeFen === 'number') {
      const actualAmount = Number(fenToYuan(totalFeeFen));
      if (Math.abs(expectedAmount - actualAmount) > 0.01) {
        throw new Error('PAYMENT_AMOUNT_MISMATCH');
      }
    }

    const balanceList = await tx
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, paymentRecord.userId))
      .limit(1);

    if (balanceList.length === 0) {
      await tx.insert(userBalances).values({
        id: crypto.randomUUID(),
        userId: paymentRecord.userId,
        availableBalance: '0',
        frozenBalance: '0',
        totalWithdrawn: '0',
        totalEarned: '0',
        createdAt: now,
        updatedAt: now,
      });
    }

    const refreshedBalanceList = balanceList.length > 0
      ? balanceList
      : await tx
        .select()
        .from(userBalances)
        .where(eq(userBalances.userId, paymentRecord.userId))
        .limit(1);

    if (refreshedBalanceList.length === 0) {
      throw new Error('USER_BALANCE_NOT_FOUND');
    }

    const balance = refreshedBalanceList[0];
    const oldBalance = Number(balance.availableBalance) || 0;
    const amount = Number(paymentRecord.amount) || 0;
    const newBalance = oldBalance + amount;
    const oldEarned = Number(balance.totalEarned) || 0;

    await tx
      .update(userBalances)
      .set({
        availableBalance: newBalance.toFixed(2),
        totalEarned: (oldEarned + amount).toFixed(2),
        updatedAt: now,
      })
      .where(eq(userBalances.userId, paymentRecord.userId));

    await tx.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      userId: paymentRecord.userId,
      transactionType: 'deposit',
      amount: amount.toFixed(2),
      balanceBefore: oldBalance.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description: `微信充值 ${amount.toFixed(2)} 元`,
      createdAt: now,
    });

    await tx
      .update(paymentRecords)
      .set({
        status: 'success',
        transactionId: transactionId || paymentRecord.transactionId || '',
        updatedAt: now,
      })
      .where(eq(paymentRecords.id, paymentRecord.id));

    await safeLogFinanceAuditEvent({
      eventType: 'wallet_recharge_wechat_paid',
      status: 'success',
      userId: paymentRecord.userId,
      orderId: paymentRecord.orderId,
      paymentRecordId: paymentRecord.id,
      amount,
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      details: {
        orderNo: paymentRecord.orderNo,
        transactionId: transactionId || paymentRecord.transactionId || '',
        paymentMethod: 'wechat',
      },
    }, tx);

    return { paymentRecord, alreadyPaid: false };
  });
}

async function markWechatPaymentFailed(recordId: string, tradeState: string, failureReason?: string) {
  await db
    .update(paymentRecords)
    .set({
      status: 'failed',
      failureReason: failureReason || tradeState,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(paymentRecords.id, recordId));

  await safeLogFinanceAuditEvent({
    eventType: 'wechat_payment_failed',
    status: 'failed',
    paymentRecordId: recordId,
    details: { tradeState },
    errorMessage: failureReason || tradeState,
  });
}

export async function reconcileWechatWalletRechargeStatus(params: {
  paymentRecordId: string;
  userId?: string;
}) {
  const conditions = [
    eq(paymentRecords.id, params.paymentRecordId),
    eq(paymentRecords.type, 'recharge'),
    eq(paymentRecords.method, 'wechat'),
  ];

  if (params.userId) {
    conditions.push(eq(paymentRecords.userId, params.userId));
  }

  const paymentRecordList = await db
    .select()
    .from(paymentRecords)
    .where(and(...conditions))
    .limit(1);

  if (paymentRecordList.length === 0) {
    throw new Error('RECHARGE_RECORD_NOT_FOUND');
  }

  const paymentRecord = paymentRecordList[0];
  if (paymentRecord.status === 'success' || !paymentRecord.thirdPartyOrderId) {
    return paymentRecord;
  }

  const transaction = await queryTransactionByOutTradeNo(paymentRecord.thirdPartyOrderId);

  if (transaction.trade_state === 'SUCCESS') {
    await markWechatWalletRechargePaid({
      outTradeNo: paymentRecord.thirdPartyOrderId,
      transactionId: transaction.transaction_id,
      totalFeeFen: transaction.amount?.total,
    });
  } else if (['CLOSED', 'REVOKED', 'PAYERROR'].includes(transaction.trade_state)) {
    await markWechatPaymentFailed(
      paymentRecord.id,
      transaction.trade_state,
      transaction.trade_state_desc
    );
  }

  const refreshedPaymentRecordList = await db
    .select()
    .from(paymentRecords)
    .where(eq(paymentRecords.id, paymentRecord.id))
    .limit(1);

  return refreshedPaymentRecordList[0] || paymentRecord;
}

export async function reconcilePendingWechatWalletRechargesForUser(userId: string) {
  const pendingRechargeRecords = await db
    .select({ id: paymentRecords.id })
    .from(paymentRecords)
    .where(and(
      eq(paymentRecords.userId, userId),
      eq(paymentRecords.type, 'recharge'),
      eq(paymentRecords.method, 'wechat'),
      eq(paymentRecords.status, 'pending'),
    ))
    .orderBy(desc(paymentRecords.createdAt))
    .limit(20);

  for (const record of pendingRechargeRecords) {
    try {
      await reconcileWechatWalletRechargeStatus({
        paymentRecordId: record.id,
        userId,
      });
    } catch (error) {
      console.error('[WeChat Pay] 对账补入微信充值失败:', record.id, error);
    }
  }
}

export async function reconcileWechatOrderStatus(orderId: string) {
  const orderList = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (orderList.length === 0) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const order = orderList[0];
  if (['paid', 'active', 'pending_verification', 'pending_consumption_confirm', 'completed'].includes(order.status || '')) {
    return order;
  }

  const transaction = await queryTransactionByOutTradeNo(order.id.replace(/-/g, ''));
  if (transaction.trade_state === 'SUCCESS') {
    await markWechatOrderPaid({
      orderId: order.id,
      transactionId: transaction.transaction_id,
      totalFeeFen: transaction.amount?.total,
    });
  }

  const refreshedOrderList = await db
    .select()
    .from(orders)
    .where(eq(orders.id, order.id))
    .limit(1);

  return refreshedOrderList[0] || order;
}
