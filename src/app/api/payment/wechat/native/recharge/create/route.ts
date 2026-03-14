import { NextRequest, NextResponse } from 'next/server';
import {
  assertWechatPaymentConfigured,
  createRechargeWechatPayment,
  requireWechatPaymentUser,
  resolveWechatPaymentError,
} from '@/lib/wechat/payment-service';

export async function POST(request: NextRequest) {
  try {
    await assertWechatPaymentConfigured();
    const user = await requireWechatPaymentUser(request);

    const body = await request.json();
    const amount = Number(body.amount || 0);

    const paymentData = await createRechargeWechatPayment({
      request,
      user,
      amount,
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
    if (resolved.message === 'INVALID_RECHARGE_AMOUNT') {
      return NextResponse.json({ success: false, error: '充值金额必须大于 0' }, { status: 400 });
    }

    console.error('[WeChat Pay] create native recharge failed:', error);
    return NextResponse.json({ success: false, error: resolved.message || '创建 Native 充值订单失败' }, { status: 500 });
  }
}
