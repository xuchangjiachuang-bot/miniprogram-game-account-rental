import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { accounts, db, orders } from '@/lib/db';
import { getServerUserId } from '@/lib/server-auth';

/**
 * Return account login credentials for a paid or active order.
 * The first successful fetch after payment activates the rental window.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    const { id } = await params;
    const orderList = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (orderList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '订单不存在',
      }, { status: 404 });
    }

    const order = orderList[0];
    const orderStatus = order.status ?? '';
    if (order.buyerId !== userId) {
      return NextResponse.json({
        success: false,
        error: '无权查看该订单的登录信息',
      }, { status: 403 });
    }

    if (!['paid', 'active'].includes(orderStatus)) {
      return NextResponse.json({
        success: false,
        error: '仅已支付或进行中的订单可查看登录信息',
      }, { status: 400 });
    }

    let effectiveOrder = order;

    if (orderStatus === 'paid') {
      const now = new Date();
      const rentalHours = Number(order.rentalDuration) || 24;
      const endTime = new Date(now.getTime() + rentalHours * 60 * 60 * 1000);

      const [updatedOrder] = await db
        .update(orders)
        .set({
          status: 'active',
          startTime: now.toISOString(),
          endTime: endTime.toISOString(),
          updatedAt: now.toISOString(),
        })
        .where(eq(orders.id, order.id))
        .returning();

      if (updatedOrder) {
        effectiveOrder = updatedOrder;
      }
    }

    const accountList = await db.select().from(accounts).where(eq(accounts.id, effectiveOrder.accountId)).limit(1);
    if (accountList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '账号不存在',
      }, { status: 404 });
    }

    const account = accountList[0];
    const customAttributes = (account.customAttributes || {}) as {
      loginMethod?: string;
      qqAccount?: string;
      qqPassword?: string;
      platform?: string;
      province?: string;
      city?: string;
    };

    if (!customAttributes.loginMethod) {
      return NextResponse.json({
        success: false,
        error: '账号登录信息不完整',
      }, { status: 400 });
    }

    const loginInfo = {
      orderId: effectiveOrder.id,
      orderNo: effectiveOrder.orderNo,
      accountId: account.id,
      accountTitle: account.title,
      loginMethod: customAttributes.loginMethod,
      qqAccount: customAttributes.qqAccount,
      qqPassword: ['qq', 'password'].includes(customAttributes.loginMethod)
        ? customAttributes.qqPassword || null
        : null,
      platform: customAttributes.platform,
      province: customAttributes.province,
      city: customAttributes.city,
      loginTime: new Date().toISOString(),
      expiryTime: effectiveOrder.endTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: '登录信息获取成功',
      data: {
        qrCodeUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(loginInfo))}`,
        loginInfo,
        qrCodeContent: JSON.stringify({
          type: 'account_login',
          orderId: effectiveOrder.id,
          timestamp: Date.now(),
        }),
        order: {
          id: effectiveOrder.id,
          status: effectiveOrder.status,
          startTime: effectiveOrder.startTime,
          endTime: effectiveOrder.endTime,
        },
      },
    });
  } catch (error: any) {
    console.error('生成登录二维码失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '生成登录二维码失败',
    }, { status: 500 });
  }
}
