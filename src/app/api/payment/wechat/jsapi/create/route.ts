import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { accounts, db, orders, users } from '@/lib/db';
import { checkWechatPayConfig } from '@/lib/wechat/config';
import { buildJsapiPaymentParams, createJsapiTransaction } from '@/lib/wechat/v3';
import { yuanToFen } from '@/lib/wechat/utils';
import {
  getAuthenticatedPaymentUser,
  getRequestClientIp,
  getWechatNotifyBaseUrl,
} from '@/lib/wechat/payment-flow';

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
    const openid = typeof body.openid === 'string' ? body.openid : user.wechat_openid;

    if (!orderId || !openid) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数: orderId 或 openid',
        },
        { status: 400 }
      );
    }

    const orderList = await db
      .select({
        order: orders,
        account: accounts,
        buyer: users,
      })
      .from(orders)
      .innerJoin(accounts, eq(orders.accountId, accounts.id))
      .innerJoin(users, eq(orders.buyerId, users.id))
      .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)))
      .limit(1);

    if (orderList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '订单不存在或无权限',
        },
        { status: 404 }
      );
    }

    const { order, buyer } = orderList[0];
    const resolvedOpenid = openid || buyer.wechatOpenid;
    if (!resolvedOpenid) {
      return NextResponse.json(
        {
          success: false,
          error: '当前用户未绑定微信 openid，无法发起微信支付',
        },
        { status: 400 }
      );
    }

    if (['paid', 'completed'].includes(order.status || '')) {
      return NextResponse.json({ success: false, error: '订单已支付' }, { status: 400 });
    }
    if (order.status === 'cancelled') {
      return NextResponse.json({ success: false, error: '订单已取消' }, { status: 400 });
    }

    const payment = await createJsapiTransaction({
      description: `订单支付 - ${order.orderNo}`,
      outTradeNo: order.id.replace(/-/g, ''),
      totalFeeFen: yuanToFen(Number(order.totalPrice || 0)),
      payerOpenid: resolvedOpenid,
      notifyUrl: `${getWechatNotifyBaseUrl(request)}/api/payment/wechat/jsapi/callback`,
      attach: JSON.stringify({
        kind: 'order',
        orderId: order.id,
      }),
      payerClientIp: getRequestClientIp(request),
    });

    const jsapiParams = await buildJsapiPaymentParams(payment.prepay_id);

    return NextResponse.json({
      success: true,
      data: {
        ...jsapiParams,
        orderId: order.id,
        totalPrice: Number(order.totalPrice || 0),
      },
    });
  } catch (error: any) {
    console.error('[WeChat Pay] 创建 JSAPI 支付订单失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '创建 JSAPI 支付订单失败',
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
