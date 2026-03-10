import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { accounts, db, orders, users } from '@/lib/db';
import { unifiedOrder, generateJSAPIPayParams } from '@/lib/wechat/api';
import { checkWechatPayConfig, getWechatPayConfig } from '@/lib/wechat/config';
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
    const openid = (body.openid as string | undefined) || user.wechat_openid;

    if (!orderId || !openid) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数: orderId 或 openid',
      }, { status: 400 });
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

    const { order, buyer } = orderList[0];
    const resolvedOpenid = openid || buyer.wechatOpenid;
    if (!resolvedOpenid) {
      return NextResponse.json({
        success: false,
        error: '当前用户未绑定微信 openid，暂时无法发起公众号支付',
      }, { status: 400 });
    }

    if (order.status === 'paid') {
      return NextResponse.json({ success: false, error: '订单已支付' }, { status: 400 });
    }
    if (order.status === 'cancelled') {
      return NextResponse.json({ success: false, error: '订单已取消' }, { status: 400 });
    }
    if (order.status === 'completed') {
      return NextResponse.json({ success: false, error: '订单已完成' }, { status: 400 });
    }

    const unifiedOrderResult = await unifiedOrder({
      openid: resolvedOpenid,
      body: `订单支付 - ${order.id}`,
      outTradeNo: order.id,
      totalFee: yuanToFen(Number(order.totalPrice || 0)),
      spbillCreateIp: getRequestClientIp(request),
      notifyUrl: `${getWechatNotifyBaseUrl(request)}/api/payment/wechat/jsapi/callback`,
      tradeType: 'JSAPI',
    });

    const config = await getWechatPayConfig();
    const jsapiParams = await generateJSAPIPayParams(unifiedOrderResult.prepayId!, config.apiKey);

    return NextResponse.json({
      success: true,
      data: {
        ...jsapiParams,
        orderId: order.id,
        totalPrice: order.totalPrice,
      },
    });
  } catch (error: any) {
    console.error('[WeChat Pay] 创建 JSAPI 支付订单失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '创建 JSAPI 支付订单失败',
    }, { status: 500 });
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
