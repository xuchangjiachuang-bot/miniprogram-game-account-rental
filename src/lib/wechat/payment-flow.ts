import { NextRequest } from 'next/server';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { accounts, balanceTransactions, db, orders, paymentRecords, userBalances } from '@/lib/db';
import { safeLogFinanceAuditEvent } from '@/lib/finance-audit-service';
import { sendOrderPaidNotification } from '@/lib/notification-service';
import { getServerToken } from '@/lib/server-auth';
import { User, verifyToken } from '@/lib/user-service';
import { notifySellerAfterOrderPaid } from '@/lib/seller-order-reminder-service';
import { lockOrderFinanceScope } from '@/lib/finance-lock-service';
import { refund } from '@/lib/wechat/refund';
import { fenToYuan } from '@/lib/wechat/utils';
import { queryTransactionByOutTradeNo } from '@/lib/wechat/v3';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const PAID_ORDER_STATUSES = [
  'paid',
  'active',
  'pending_verification',
  'pending_consumption_confirm',
  'completed',
];

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

async function upsertWechatOrderPaymentRecord(
  tx: DbTransaction,
  params: {
    orderId: string;
    orderNo: string;
    buyerId: string;
    amount: string;
    transactionId: string;
    thirdPartyOrderId: string;
    now: string;
  },
) {
  const existingRecord = await tx
    .select({ id: paymentRecords.id })
    .from(paymentRecords)
    .where(and(
      eq(paymentRecords.orderId, params.orderId),
      eq(paymentRecords.type, 'payment'),
      eq(paymentRecords.method, 'wechat'),
    ))
    .limit(1);

  if (existingRecord.length > 0) {
    await tx
      .update(paymentRecords)
      .set({
        orderNo: params.orderNo,
        userId: params.buyerId,
        amount: params.amount,
        transactionId: params.transactionId,
        thirdPartyOrderId: params.thirdPartyOrderId,
        status: 'success',
        failureReason: null,
        updatedAt: params.now,
      })
      .where(eq(paymentRecords.id, existingRecord[0].id));

    return existingRecord[0].id;
  }

  const inserted = await tx
    .insert(paymentRecords)
    .values({
      id: crypto.randomUUID(),
      orderId: params.orderId,
      orderNo: params.orderNo,
      userId: params.buyerId,
      amount: params.amount,
      type: 'payment',
      method: 'wechat',
      transactionId: params.transactionId,
      thirdPartyOrderId: params.thirdPartyOrderId,
      status: 'success',
      createdAt: params.now,
      updatedAt: params.now,
    })
    .returning({ id: paymentRecords.id });

  return inserted[0]?.id || null;
}

async function requestRefundForCancelledPaidOrder(params: {
  orderId: string;
  orderNo: string;
  buyerId: string;
  amount: string;
  transactionId: string;
}) {
  const refundAmount = Number(params.amount || 0);
  if (refundAmount <= 0 || !params.transactionId) {
    return;
  }

  await db.transaction(async (tx) => {
    await lockOrderFinanceScope(
      tx as unknown as { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
      params.orderId,
    );

    const existingRefund = await tx
      .select({ id: paymentRecords.id, status: paymentRecords.status })
      .from(paymentRecords)
      .where(and(
        eq(paymentRecords.orderId, params.orderId),
        eq(paymentRecords.type, 'refund'),
        eq(paymentRecords.method, 'wechat'),
      ))
      .limit(1);

    if (existingRefund.length > 0 && !['failed', 'exception'].includes(existingRefund[0].status || '')) {
      return;
    }

    const outRefundNo = `RF${params.orderId.replace(/-/g, '').slice(0, 16)}${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const refundResult = await refund({
      transactionId: params.transactionId,
      outTradeNo: params.orderId,
      outRefundNo,
      totalFee: Math.round(refundAmount * 100),
      refundFee: Math.round(refundAmount * 100),
      refundDesc: `Cancelled order ${params.orderNo} auto refund`,
    });

    const now = new Date().toISOString();
    await tx.insert(paymentRecords).values({
      id: crypto.randomUUID(),
      orderId: params.orderId,
      orderNo: params.orderNo,
      userId: params.buyerId,
      amount: refundAmount.toFixed(2),
      type: 'refund',
      method: 'wechat',
      transactionId: refundResult.refundId || '',
      thirdPartyOrderId: outRefundNo,
      status: 'processing',
      failureReason: 'ORDER_ALREADY_CANCELLED',
      createdAt: now,
      updatedAt: now,
    });

    await safeLogFinanceAuditEvent({
      eventType: 'order_payment_wechat_cancelled_auto_refund_requested',
      status: 'pending',
      userId: params.buyerId,
      orderId: params.orderId,
      amount: refundAmount,
      details: {
        orderNo: params.orderNo,
        transactionId: params.transactionId,
        outRefundNo,
      },
    }, tx);
  });
}

export async function markWechatOrderPaid(params: {
  orderId: string;
  transactionId?: string | null;
  totalFeeFen?: number | null;
}) {
  const { orderId, transactionId, totalFeeFen } = params;
  const now = new Date().toISOString();

  const result = await db.transaction(async (tx) => {
    await lockOrderFinanceScope(tx as unknown as { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }, orderId);

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
    const paidAmount = typeof totalFeeFen === 'number' ? fenToYuan(totalFeeFen) : String(order.totalPrice || 0);
    const resolvedTransactionId = transactionId || order.transactionId || '';
    const resolvedOutTradeNo = order.id.replace(/-/g, '');

    if (typeof totalFeeFen === 'number') {
      const actualAmount = Number(fenToYuan(totalFeeFen));
      if (Math.abs(expectedAmount - actualAmount) > 0.01) {
        throw new Error('PAYMENT_AMOUNT_MISMATCH');
      }
    }

    if (order.status === 'cancelled') {
      const paymentRecordId = await upsertWechatOrderPaymentRecord(tx, {
        orderId: order.id,
        orderNo: order.orderNo,
        buyerId: order.buyerId,
        amount: paidAmount,
        transactionId: resolvedTransactionId,
        thirdPartyOrderId: resolvedOutTradeNo,
        now,
      });

      await safeLogFinanceAuditEvent({
        eventType: 'order_payment_wechat_paid_after_cancelled',
        status: 'failed',
        userId: order.buyerId,
        orderId: order.id,
        paymentRecordId,
        amount: paidAmount,
        details: {
          orderNo: order.orderNo,
          transactionId: resolvedTransactionId,
          paymentMethod: 'wechat',
        },
        errorMessage: 'ORDER_ALREADY_CANCELLED',
      }, tx);

      return {
        order,
        alreadyPaid: true,
        ignored: true,
        autoRefund: {
          orderId: order.id,
          orderNo: order.orderNo,
          buyerId: order.buyerId,
          amount: paidAmount,
          transactionId: resolvedTransactionId,
        },
      };
    }

    const rentalHours = Number(order.rentalDuration) || 24;
    const endTime = new Date(Date.now() + rentalHours * 60 * 60 * 1000).toISOString();

    const claimedOrderRows = await tx
      .update(orders)
      .set({
        status: 'active',
        paymentTime: now,
        paymentMethod: 'wechat',
        transactionId: resolvedTransactionId,
        startTime: now,
        endTime,
        updatedAt: now,
      })
      .where(and(
        eq(orders.id, orderId),
        eq(orders.status, 'pending_payment'),
      ))
      .returning();

    const effectiveOrder = claimedOrderRows[0] || order;
    const alreadyPaid = claimedOrderRows.length === 0;

    if (alreadyPaid && !PAID_ORDER_STATUSES.includes(order.status || '')) {
      throw new Error(`ORDER_STATUS_INVALID:${order.status || 'unknown'}`);
    }

    const paymentRecordId = await upsertWechatOrderPaymentRecord(tx, {
      orderId: effectiveOrder.id,
      orderNo: effectiveOrder.orderNo,
      buyerId: effectiveOrder.buyerId,
      amount: paidAmount,
      transactionId: resolvedTransactionId,
      thirdPartyOrderId: resolvedOutTradeNo,
      now,
    });

    await tx
      .update(accounts)
      .set({
        status: 'rented',
        updatedAt: now,
      })
      .where(eq(accounts.id, effectiveOrder.accountId));

    await safeLogFinanceAuditEvent({
      eventType: 'order_payment_wechat_paid',
      status: 'success',
      userId: effectiveOrder.buyerId,
      orderId: effectiveOrder.id,
      paymentRecordId,
      amount: paidAmount,
      details: {
        orderNo: effectiveOrder.orderNo,
        transactionId: resolvedTransactionId,
        paymentMethod: 'wechat',
      },
    }, tx);

      return { order: effectiveOrder, alreadyPaid, ignored: false, autoRefund: null };
  });

  if (result.autoRefund) {
    try {
      await requestRefundForCancelledPaidOrder(result.autoRefund);
    } catch (error) {
      console.error('[WeChat Pay] failed to auto refund cancelled paid order', result.autoRefund.orderId, error);
    }
  }

  if (!result.alreadyPaid && !result.ignored) {
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

    const claimedRecordRows = await tx
      .update(paymentRecords)
      .set({
        status: 'success',
        transactionId: transactionId || paymentRecord.transactionId || '',
        failureReason: null,
        updatedAt: now,
      })
      .where(and(
        eq(paymentRecords.id, paymentRecord.id),
        inArray(paymentRecords.status, ['pending', 'processing']),
      ))
      .returning();

    if (claimedRecordRows.length === 0) {
      const refreshedRecordList = await tx
        .select()
        .from(paymentRecords)
        .where(eq(paymentRecords.id, paymentRecord.id))
        .limit(1);

      const refreshedRecord = refreshedRecordList[0];
      if (!refreshedRecord) {
        throw new Error('RECHARGE_RECORD_NOT_FOUND');
      }

      if (refreshedRecord.status === 'success') {
        return { paymentRecord: refreshedRecord, alreadyPaid: true };
      }

      throw new Error(`RECHARGE_RECORD_STATUS_INVALID:${refreshedRecord.status}`);
    }

    await tx
      .insert(userBalances)
      .values({
        id: crypto.randomUUID(),
        userId: paymentRecord.userId,
        availableBalance: '0',
        frozenBalance: '0',
        totalWithdrawn: '0',
        totalEarned: '0',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: userBalances.userId });

    const amount = Number(paymentRecord.amount) || 0;
    const balanceRows = await tx
      .update(userBalances)
      .set({
        availableBalance: sql`${userBalances.availableBalance} + ${amount.toFixed(2)}`,
        totalEarned: sql`${userBalances.totalEarned} + ${amount.toFixed(2)}`,
        updatedAt: now,
      })
      .where(eq(userBalances.userId, paymentRecord.userId))
      .returning({
        availableBalance: userBalances.availableBalance,
      });

    if (balanceRows.length === 0) {
      throw new Error('USER_BALANCE_NOT_FOUND');
    }

    const newBalance = Number(balanceRows[0].availableBalance || 0);
    const oldBalance = newBalance - amount;

    await tx.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      userId: paymentRecord.userId,
      transactionType: 'deposit',
      amount: amount.toFixed(2),
      balanceBefore: oldBalance.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description: `Wechat recharge ${amount.toFixed(2)}`,
      createdAt: now,
    });

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

    return {
      paymentRecord: {
        ...paymentRecord,
        status: 'success',
        transactionId: transactionId || paymentRecord.transactionId || '',
      },
      alreadyPaid: false,
    };
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
      transaction.trade_state_desc,
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
      console.error('[WeChat Pay] failed to reconcile wallet recharge', record.id, error);
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
  if (PAID_ORDER_STATUSES.includes(order.status || '')) {
    return order;
  }

  if (order.status === 'cancelled') {
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
