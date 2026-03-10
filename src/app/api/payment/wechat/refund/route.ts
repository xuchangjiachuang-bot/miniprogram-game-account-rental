import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, orders, paymentRecords } from '@/lib/db';
import { refund } from '@/lib/wechat/refund';
import { checkWechatPayConfig } from '@/lib/wechat/config';
import { generateNonceStr, yuanToFen } from '@/lib/wechat/utils';
import { getAuthenticatedPaymentUser } from '@/lib/wechat/payment-flow';

export async function POST(request: NextRequest) {
  try {
    const configCheck = await checkWechatPayConfig();
    if (!configCheck.valid) {
      return NextResponse.json({
        success: false,
        error: '微信支付配置不完整',
        missing: configCheck.missing,
      }, { status: 500 });
    }

    const user = await getAuthenticatedPaymentUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    const body = await request.json();
    const orderId = body.orderId as string | undefined;
    const refundAmount = Number(body.refundAmount || 0);
    const refundReason = body.refundReason as string | undefined;

    if (!orderId || refundAmount <= 0 || !refundReason) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数',
      }, { status: 400 });
    }

    const orderList = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.buyerId, user.id),
      ))
      .limit(1);

    if (orderList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '订单不存在或无权限',
      }, { status: 404 });
    }

    const order = orderList[0];
    if (order.status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: '只有已支付的订单才能申请退款',
      }, { status: 400 });
    }

    if (refundAmount > Number(order.totalPrice || 0)) {
      return NextResponse.json({
        success: false,
        error: '退款金额不能超过订单金额',
      }, { status: 400 });
    }

    const existingRefundList = await db
      .select({ id: paymentRecords.id })
      .from(paymentRecords)
      .where(and(
        eq(paymentRecords.orderId, order.id),
        eq(paymentRecords.type, 'refund'),
      ))
      .limit(1);

    if (existingRefundList.length > 0) {
      return NextResponse.json({
        success: false,
        error: '该订单已存在退款申请',
      }, { status: 400 });
    }

    const outRefundNo = `RF${order.id.replace(/-/g, '').slice(0, 16)}${generateNonceStr(8)}`;
    const refundResult = await refund({
      transactionId: order.transactionId || undefined,
      outTradeNo: order.id,
      outRefundNo,
      totalFee: yuanToFen(Number(order.totalPrice || 0)),
      refundFee: yuanToFen(refundAmount),
      refundDesc: refundReason,
    });

    const now = new Date().toISOString();
    await db.insert(paymentRecords).values({
      orderId: order.id,
      orderNo: order.orderNo,
      userId: user.id,
      amount: refundAmount.toFixed(2),
      type: 'refund',
      method: 'wechat',
      transactionId: refundResult.refundId || '',
      thirdPartyOrderId: outRefundNo,
      status: 'processing',
      failureReason: refundReason,
      createdAt: now,
      updatedAt: now,
    });

    await db
      .update(orders)
      .set({
        status: 'refunding',
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    return NextResponse.json({
      success: true,
      data: {
        refundId: outRefundNo,
        refundAmount: refundAmount.toFixed(2),
        refundStatus: 'processing',
      },
    });
  } catch (error: any) {
    console.error('[WeChat Pay] 退款申请失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '退款申请失败',
    }, { status: 500 });
  }
}
