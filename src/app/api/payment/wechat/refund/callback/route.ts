import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders, paymentRecords } from '@/lib/db';
import { restoreAccountAvailabilityIfNoBlockingOrders } from '@/lib/account-service';
import { safeLogFinanceAuditEvent } from '@/lib/finance-audit-service';
import { settleCompletedOrder } from '@/lib/order-settlement-service';
import { fenToYuan, objectToXML, verifySign, xmlToObject } from '@/lib/wechat/utils';
import { getWechatPayConfig } from '@/lib/wechat/config';

/**
 * Legacy refund callback handler.
 * Kept for compatibility until the refund flow is fully migrated to v3.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const callbackData = xmlToObject(body);
    const config = await getWechatPayConfig();

    if (!verifySign(callbackData, config.apiKey)) {
      return new NextResponse(objectToXML({
        return_code: 'FAIL',
        return_msg: '签名验证失败',
      }), {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    if (callbackData.return_code !== 'SUCCESS') {
      return new NextResponse(objectToXML({
        return_code: 'FAIL',
        return_msg: callbackData.return_msg || '回调失败',
      }), {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    const outRefundNo = callbackData.out_refund_no as string;
    const refundId = callbackData.refund_id as string;
    const refundStatus = callbackData.refund_status as string;
    const refundFeeFen = Number(callbackData.refund_fee || 0);

    console.log('[WeChat Pay] Refund callback:', {
      outRefundNo,
      refundId,
      refundStatus,
      refundFee: fenToYuan(refundFeeFen),
    });

    const refundRecordList = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.thirdPartyOrderId, outRefundNo))
      .limit(1);

    if (refundRecordList.length === 0) {
      return new NextResponse(objectToXML({
        return_code: 'FAIL',
        return_msg: '退款记录不存在',
      }), {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    const refundRecord = refundRecordList[0];
    if (['success', 'failed'].includes(refundRecord.status)) {
      return new NextResponse(objectToXML({
        return_code: 'SUCCESS',
        return_msg: 'OK',
      }), {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    const status =
      refundStatus === 'SUCCESS'
        ? 'success'
        : refundStatus === 'FAIL'
          ? 'failed'
          : refundStatus === 'CHANGE'
            ? 'exception'
            : 'processing';

    await db
      .update(paymentRecords)
      .set({
        status,
        transactionId: refundId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentRecords.id, refundRecord.id));

    await safeLogFinanceAuditEvent({
      eventType: refundRecord.type === 'deposit_refund' ? 'order_deposit_refund_callback' : 'order_refund_callback',
      status: status === 'success' ? 'success' : status === 'failed' ? 'failed' : 'pending',
      userId: refundRecord.userId,
      orderId: refundRecord.orderId,
      paymentRecordId: refundRecord.id,
      amount: Number(refundRecord.amount) || 0,
      details: {
        outRefundNo,
        refundId,
        refundStatus,
      },
      errorMessage: status === 'failed' ? (callbackData.err_code_des as string || callbackData.return_msg as string || refundStatus) : null,
    });

    if (status === 'success') {
      if (refundRecord.type === 'deposit_refund') {
        await settleCompletedOrder(refundRecord.orderId);

        return new NextResponse(objectToXML({
          return_code: 'SUCCESS',
          return_msg: 'OK',
        }), {
          headers: { 'Content-Type': 'application/xml' },
        });
      }

      const orderList = await db
        .select()
        .from(orders)
        .where(eq(orders.id, refundRecord.orderId))
        .limit(1);

      if (orderList.length > 0) {
        const order = orderList[0];
        const now = new Date().toISOString();

        await db
          .update(orders)
          .set({
            status: 'refunded',
            updatedAt: now,
          })
          .where(eq(orders.id, order.id));

        await restoreAccountAvailabilityIfNoBlockingOrders(order.accountId);
      }
    }

    return new NextResponse(objectToXML({
      return_code: 'SUCCESS',
      return_msg: 'OK',
    }), {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error: any) {
    console.error('[WeChat Pay] Refund callback failed:', error);
    return new NextResponse(objectToXML({
      return_code: 'FAIL',
      return_msg: '处理失败',
    }), {
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
