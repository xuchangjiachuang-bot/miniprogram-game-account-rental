import { NextRequest, NextResponse } from 'next/server';
import { db, paymentRecords, userBalances } from '@/lib/db';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';
import { checkWechatPayConfig } from '@/lib/wechat/config';
import { buildJsapiPaymentParams, createJsapiTransaction } from '@/lib/wechat/v3';
import { getRequestClientIp, getWechatNotifyBaseUrl } from '@/lib/wechat/payment-flow';
import { eq } from 'drizzle-orm';
import { yuanToFen } from '@/lib/wechat/utils';

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
    const openid = typeof body.openid === 'string' ? body.openid : user.wechat_openid;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: '充值金额必须大于 0' }, { status: 400 });
    }

    if (!openid) {
      return NextResponse.json({ success: false, error: '当前账号未绑定微信 openid' }, { status: 400 });
    }

    const existingBalance = await db
      .select({ id: userBalances.id })
      .from(userBalances)
      .where(eq(userBalances.userId, user.id))
      .limit(1);

    if (existingBalance.length === 0) {
      await db.insert(userBalances).values({
        id: crypto.randomUUID(),
        userId: user.id,
        availableBalance: '0',
        frozenBalance: '0',
        totalWithdrawn: '0',
        totalEarned: '0',
      });
    }

    const paymentRecordId = crypto.randomUUID();
    const outTradeNo = paymentRecordId.replace(/-/g, '');
    const orderNo = `RC${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    await db.insert(paymentRecords).values({
      id: paymentRecordId,
      orderId: paymentRecordId,
      orderNo,
      userId: user.id,
      amount: amount.toFixed(2),
      type: 'recharge',
      method: 'wechat',
      transactionId: '',
      thirdPartyOrderId: outTradeNo,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const payment = await createJsapiTransaction({
      description: `钱包充值 ${amount.toFixed(2)} 元`,
      outTradeNo,
      totalFeeFen: yuanToFen(amount),
      payerOpenid: openid,
      notifyUrl: `${getWechatNotifyBaseUrl(request)}/api/payment/wechat/jsapi/callback`,
      attach: JSON.stringify({
        kind: 'wallet_recharge',
        paymentRecordId,
        userId: user.id,
      }),
      payerClientIp: getRequestClientIp(request),
    });

    const jsapiParams = await buildJsapiPaymentParams(payment.prepay_id);

    return NextResponse.json({
      success: true,
      data: {
        ...jsapiParams,
        rechargeId: paymentRecordId,
        amount,
      },
    });
  } catch (error: any) {
    console.error('[WeChat Pay] 创建钱包充值订单失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '创建钱包充值订单失败',
      },
      { status: 500 }
    );
  }
}
