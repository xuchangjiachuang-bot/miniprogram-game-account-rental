import { NextRequest, NextResponse } from 'next/server';
import { checkWechatPayConfig } from '@/lib/wechat/config';
import { getAuthenticatedPaymentUser } from '@/lib/wechat/payment-flow';
import { createWechatOrderPayment } from '@/lib/wechat/payment-request';

export async function POST(request: NextRequest) {
  try {
    const configCheck = await checkWechatPayConfig();
    if (!configCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: '微信支付配置不完整',
          missing: configCheck.missing,
        },
        { status: 500 }
      );
    }

    const user = await getAuthenticatedPaymentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';

    if (!orderId) {
      return NextResponse.json({ success: false, error: '缺少必要参数: orderId' }, { status: 400 });
    }

    const paymentData = await createWechatOrderPayment({
      request,
      user,
      orderId,
      channel: 'native',
    });

    return NextResponse.json({ success: true, data: paymentData });
  } catch (error: any) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: '订单不存在或无权限' }, { status: 404 });
    }
    if (error.message === 'ORDER_ALREADY_PAID') {
      return NextResponse.json({ success: false, error: '订单已支付' }, { status: 400 });
    }
    if (error.message === 'ORDER_CANCELLED') {
      return NextResponse.json({ success: false, error: '订单已取消' }, { status: 400 });
    }

    console.error('[WeChat Pay] 创建 Native 支付订单失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '创建 Native 支付订单失败',
      },
      { status: 500 }
    );
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
