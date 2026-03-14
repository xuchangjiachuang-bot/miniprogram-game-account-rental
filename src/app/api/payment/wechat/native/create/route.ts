import { NextRequest, NextResponse } from 'next/server';
import {
  assertWechatPaymentConfigured,
  createOrderWechatPayment,
  requireWechatPaymentUser,
  resolveWechatPaymentError,
} from '@/lib/wechat/payment-service';
import { checkWechatPayConfig } from '@/lib/wechat/config';

export async function POST(request: NextRequest) {
  try {
    await assertWechatPaymentConfigured();
    const user = await requireWechatPaymentUser(request);

    const body = await request.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';

    if (!orderId) {
      return NextResponse.json({ success: false, error: '缺少必要参数: orderId' }, { status: 400 });
    }

    const paymentData = await createOrderWechatPayment({
      request,
      user,
      orderId,
      channel: 'native',
    });

    return NextResponse.json({ success: true, data: paymentData });
  } catch (error) {
    const resolved = resolveWechatPaymentError(error);

    if (resolved.message === 'WECHAT_PAY_CONFIG_INVALID') {
      return NextResponse.json({ success: false, error: '微信支付配置不完整', missing: resolved.missing }, { status: 500 });
    }
    if (resolved.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }
    if (resolved.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: '订单不存在或无权限' }, { status: 404 });
    }
    if (resolved.message === 'ORDER_ALREADY_PAID') {
      return NextResponse.json({ success: false, error: '订单已支付' }, { status: 400 });
    }
    if (resolved.message === 'ORDER_CANCELLED') {
      return NextResponse.json({ success: false, error: '订单已取消' }, { status: 400 });
    }

    console.error('[WeChat Pay] create native order payment failed:', error);
    return NextResponse.json({ success: false, error: resolved.message || '创建 Native 支付订单失败' }, { status: 500 });
  }
}

export async function GET() {
  const configCheck = await checkWechatPayConfig();

  return NextResponse.json({
    success: true,
    data: {
      configured: configCheck.valid,
      missing: configCheck.missing,
    },
  });
}
