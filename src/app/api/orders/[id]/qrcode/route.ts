import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { accounts, db, orders } from '@/lib/db';
import { getServerUserId } from '@/lib/server-auth';

const LOGIN_VISIBLE_ORDER_STATUSES = [
  'active',
  'pending_verification',
  'pending_consumption_confirm',
  'disputed',
  'completed',
];

/**
 * Returns order login information.
 * Password credentials are displayed on the order page.
 * Scan-login QR codes are sent in the order group chat instead.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 },
      );
    }

    const { id } = await params;
    const orderRows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    const order = orderRows[0];

    if (!order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 },
      );
    }

    if (order.buyerId !== userId) {
      return NextResponse.json(
        { success: false, error: '无权查看该订单的登录信息' },
        { status: 403 },
      );
    }

    if (!LOGIN_VISIBLE_ORDER_STATUSES.includes(order.status ?? '')) {
      return NextResponse.json(
        { success: false, error: '当前订单状态暂不可查看登录信息' },
        { status: 400 },
      );
    }

    const accountRows = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, order.accountId))
      .limit(1);
    const account = accountRows[0];

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 },
      );
    }

    const customAttributes = (account.customAttributes || {}) as {
      loginMethod?: string;
      qqAccount?: string;
      qqPassword?: string;
      platform?: string;
      province?: string;
      city?: string;
    };

    if (!customAttributes.loginMethod) {
      return NextResponse.json(
        { success: false, error: '账号登录信息不完整' },
        { status: 400 },
      );
    }

    const loginInfo = {
      orderId: order.id,
      orderNo: order.orderNo,
      accountId: account.id,
      accountTitle: account.title,
      loginMethod: customAttributes.loginMethod,
      qqAccount: customAttributes.qqAccount || null,
      qqPassword: ['qq', 'password', 'qq_password'].includes(customAttributes.loginMethod)
        ? customAttributes.qqPassword || null
        : null,
      platform: customAttributes.platform,
      province: customAttributes.province,
      city: customAttributes.city,
      loginTime: order.startTime || new Date().toISOString(),
      expiryTime: order.endTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: '登录信息获取成功',
      data: {
        loginInfo,
        order: {
          id: order.id,
          status: order.status,
          startTime: order.startTime,
          endTime: order.endTime,
        },
      },
    });
  } catch (error: unknown) {
    console.error('[Order QRCode] 获取登录信息失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取登录信息失败',
      },
      { status: 500 },
    );
  }
}
