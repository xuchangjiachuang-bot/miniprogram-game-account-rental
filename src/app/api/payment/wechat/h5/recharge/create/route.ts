import { NextRequest, NextResponse } from 'next/server';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';
import { checkWechatPayConfig } from '@/lib/wechat/config';
import { createWechatRechargePayment } from '@/lib/wechat/payment-request';

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

    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: '登录状态已失效，请重新登录' }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount || 0);

    const paymentData = await createWechatRechargePayment({
      request,
      user,
      amount,
      channel: 'h5',
    });

    return NextResponse.json({ success: true, data: paymentData });
  } catch (error: any) {
    if (error.message === 'INVALID_RECHARGE_AMOUNT') {
      return NextResponse.json({ success: false, error: '充值金额必须大于 0' }, { status: 400 });
    }

    console.error('[WeChat Pay] 创建 H5 充值订单失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '创建 H5 充值订单失败',
      },
      { status: 500 }
    );
  }
}
