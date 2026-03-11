import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { accounts, db, orders, users } from '@/lib/db';
import { checkWechatPayConfig } from '@/lib/wechat/config';
import { buildJsapiPaymentParams, createJsapiTransaction } from '@/lib/wechat/v3';
import { yuanToFen } from '@/lib/wechat/utils';
import { generateOrderNo } from '@/lib/utils/order';
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
    const accountId = typeof body.accountId === 'string' ? body.accountId : '';
    const rentalHours = Number(body.rentalHours || 0);

    if (!accountId || rentalHours <= 0) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    const accountList = await db
      .select({
        account: accounts,
        seller: users,
      })
      .from(accounts)
      .innerJoin(users, eq(accounts.sellerId, users.id))
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (accountList.length === 0) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 });
    }

    const { account } = accountList[0];
    if (account.status !== 'available') {
      return NextResponse.json({ success: false, error: '账号不可用' }, { status: 400 });
    }

    const dbUserList = await db
      .select({
        id: users.id,
        wechatOpenid: users.wechatOpenid,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const dbUser = dbUserList[0];
    if (!dbUser?.wechatOpenid) {
      return NextResponse.json({ success: false, error: '用户未绑定微信 openid' }, { status: 400 });
    }

    const rentalPrice = Number(account.recommendedRental || 0) * (rentalHours / 24);
    const deposit = Number(account.deposit || 0);
    const totalPrice = rentalPrice + deposit;

    const [newOrder] = await db.insert(orders).values({
      id: crypto.randomUUID(),
      orderNo: generateOrderNo(),
      buyerId: user.id,
      sellerId: account.sellerId,
      accountId: account.id,
      status: 'pending_payment',
      rentalDuration: rentalHours * 3600,
      rentalPrice: rentalPrice.toFixed(2),
      deposit: deposit.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      paymentMethod: 'wechat',
    }).returning();

    const payment = await createJsapiTransaction({
      description: `账号租赁 - ${account.title}`,
      outTradeNo: newOrder.id.replace(/-/g, ''),
      totalFeeFen: yuanToFen(totalPrice),
      payerOpenid: dbUser.wechatOpenid,
      notifyUrl: `${getWechatNotifyBaseUrl(request)}/api/payment/wechat/minip/callback`,
      attach: JSON.stringify({
        kind: 'order',
        orderId: newOrder.id,
      }),
      payerClientIp: getRequestClientIp(request),
    });

    const jsapiParams = await buildJsapiPaymentParams(payment.prepay_id);

    return NextResponse.json({
      success: true,
      data: {
        ...jsapiParams,
        orderId: newOrder.id,
        orderNo: newOrder.orderNo,
        totalPrice: totalPrice.toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('[WeChat Pay] 创建小程序支付订单失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '创建小程序支付订单失败',
      },
      { status: 500 }
    );
  }
}
