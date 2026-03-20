import { and, desc, eq } from 'drizzle-orm';
import { db, orders, paymentRecords } from '@/lib/db';
import { safeLogFinanceAuditEvent } from '@/lib/finance-audit-service';
import { getApprovedConsumptionSummary } from '@/lib/order-consumption-service';
import { executeAutoSplit } from '@/lib/platform-split-service';
import { refund } from '@/lib/wechat/refund';
import { generateNonceStr, yuanToFen } from '@/lib/wechat/utils';

export interface SettlementResult {
  success: boolean;
  message: string;
  settled: boolean;
  pendingRefund: boolean;
  platformCommission: number;
  sellerIncome: number;
  buyerRefund: number;
}

async function resolveOrderTransactionId(order: typeof orders.$inferSelect) {
  if (order.transactionId) {
    return order.transactionId;
  }

  const paymentRows = await db
    .select({
      transactionId: paymentRecords.transactionId,
    })
    .from(paymentRecords)
    .where(
      and(
        eq(paymentRecords.orderId, order.id),
        eq(paymentRecords.type, 'payment'),
        eq(paymentRecords.method, 'wechat'),
        eq(paymentRecords.status, 'success'),
      ),
    )
    .limit(1);

  const transactionId = paymentRows[0]?.transactionId || '';
  if (!transactionId) {
    return '';
  }

  await db
    .update(orders)
    .set({
      transactionId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, order.id));

  return transactionId;
}

async function requestWechatDepositRefund(order: typeof orders.$inferSelect) {
  const depositAmount = Number(order.deposit) || 0;
  const consumptionSummary = await getApprovedConsumptionSummary(order.id);
  const buyerRefundAmount = Math.max(0, depositAmount - (consumptionSummary.depositDeductedAmount || 0));

  if (buyerRefundAmount <= 0) {
    return { success: true, message: 'NO_DEPOSIT', pendingRefund: false };
  }

  const transactionId = await resolveOrderTransactionId(order);
  if (!transactionId) {
    throw new Error('ORDER_TRANSACTION_ID_MISSING');
  }

  const outRefundNo = `DR${order.id.replace(/-/g, '').slice(0, 16)}${generateNonceStr(8)}`;
  const refundResult = await refund({
    transactionId: transactionId || undefined,
    outTradeNo: order.id,
    outRefundNo,
    totalFee: yuanToFen(Number(order.totalPrice) || 0),
    refundFee: yuanToFen(buyerRefundAmount),
    refundDesc: `Order ${order.orderNo} deposit refund`,
  });

  const now = new Date().toISOString();
  await db.insert(paymentRecords).values({
    id: crypto.randomUUID(),
    orderId: order.id,
    orderNo: order.orderNo,
    userId: order.buyerId,
    amount: buyerRefundAmount.toFixed(2),
    type: 'deposit_refund',
    method: 'wechat',
    transactionId: refundResult.refundId || '',
    thirdPartyOrderId: outRefundNo,
    status: 'processing',
    createdAt: now,
    updatedAt: now,
  });

  await safeLogFinanceAuditEvent({
    eventType: 'order_deposit_refund_requested',
    status: 'pending',
    userId: order.buyerId,
    orderId: order.id,
    amount: buyerRefundAmount,
    details: {
      orderNo: order.orderNo,
      outRefundNo,
      transactionId,
      depositDeductedAmount: consumptionSummary.depositDeductedAmount || 0,
    },
  });

  return {
    success: true,
    message: 'ORDER_DEPOSIT_REFUND_REQUESTED',
    pendingRefund: true,
  };
}

export async function settleCompletedOrder(orderId: string): Promise<SettlementResult> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const order = orderRows[0];
  if (!order) {
    return {
      success: false,
      message: 'ORDER_NOT_FOUND',
      settled: false,
      pendingRefund: false,
      platformCommission: 0,
      sellerIncome: 0,
      buyerRefund: 0,
    };
  }

  if (order.isSettled) {
    const settledConsumptionSummary = await getApprovedConsumptionSummary(order.id);
    return {
      success: true,
      message: 'ORDER_ALREADY_SETTLED',
      settled: true,
      pendingRefund: false,
      platformCommission: Number(order.platformFee) || 0,
      sellerIncome: Number(order.sellerIncome) || 0,
      buyerRefund: order.paymentMethod === 'wallet'
        ? Math.max(0, (Number(order.deposit) || 0) - (settledConsumptionSummary.depositDeductedAmount || 0))
        : 0,
    };
  }

  const paymentMethod = order.paymentMethod || 'wechat';
  const depositAmount = Number(order.deposit) || 0;
  const consumptionSummary = await getApprovedConsumptionSummary(order.id);
  const buyerRefundAmount = Math.max(0, depositAmount - (consumptionSummary.depositDeductedAmount || 0));

  if (paymentMethod !== 'wechat' || depositAmount <= 0) {
    const splitResult = await executeAutoSplit(orderId);
    return {
      ...splitResult,
      settled: splitResult.success,
      pendingRefund: false,
    };
  }

  const refundRows = await db
    .select()
    .from(paymentRecords)
    .where(and(
      eq(paymentRecords.orderId, order.id),
      eq(paymentRecords.type, 'deposit_refund'),
      eq(paymentRecords.method, 'wechat'),
    ))
    .orderBy(desc(paymentRecords.createdAt))
    .limit(1);

  const refundRecord = refundRows[0];
  if (!refundRecord) {
    const result = await requestWechatDepositRefund(order);
    return {
      success: result.success,
      message: result.message,
      settled: false,
      pendingRefund: result.pendingRefund,
      platformCommission: 0,
      sellerIncome: 0,
      buyerRefund: buyerRefundAmount,
    };
  }

  if (refundRecord.status === 'success') {
    const splitResult = await executeAutoSplit(orderId);
    return {
      ...splitResult,
      settled: splitResult.success,
      pendingRefund: false,
    };
  }

  if (['pending', 'processing'].includes(refundRecord.status)) {
    return {
      success: true,
      message: 'ORDER_DEPOSIT_REFUND_PENDING',
      settled: false,
      pendingRefund: true,
      platformCommission: 0,
      sellerIncome: 0,
      buyerRefund: buyerRefundAmount,
    };
  }

  return {
    success: false,
    message: refundRecord.failureReason || 'ORDER_DEPOSIT_REFUND_FAILED',
    settled: false,
    pendingRefund: false,
    platformCommission: 0,
    sellerIncome: 0,
    buyerRefund: buyerRefundAmount,
  };
}
