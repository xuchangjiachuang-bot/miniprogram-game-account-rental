import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders } from '@/lib/db';
import { getOrderDispute } from '@/lib/dispute-service';
import { transformDbOrderToApiFormat } from '@/lib/order-service';
import { syncSingleOrderLifecycle } from '@/lib/order-lifecycle-service';
import { reconcileWechatOrderStatus } from '@/lib/wechat/payment-flow';
import { getServerUserId } from '@/lib/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;

    let orderList = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    if (orderList[0].status === 'pending_payment') {
      try {
        const reconciledOrder = await reconcileWechatOrderStatus(id);
        orderList = [reconciledOrder];
      } catch (error) {
        console.warn('[Order Detail] Failed to reconcile payment status:', error);
      }
    }

    try {
      const syncedOrder = await syncSingleOrderLifecycle(id);
      if (syncedOrder) {
        orderList = [syncedOrder];
      }
    } catch (error) {
      console.warn('[Order Detail] Failed to sync lifecycle status:', error);
    }

    const order = orderList[0];
    if (![order.buyerId, order.sellerId].includes(userId)) {
      return NextResponse.json({ success: false, error: '无权查看该订单' }, { status: 403 });
    }

    const dispute = await getOrderDispute(order.id);

    return NextResponse.json({
      success: true,
      data: {
        ...transformDbOrderToApiFormat(order),
        dispute,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取订单详情失败',
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    if (action !== 'complete') {
      if (action === 'cancel') {
        return NextResponse.json({ success: false, error: '取消订单功能待实现' }, { status: 501 });
      }

      return NextResponse.json({ success: false, error: '未知的操作' }, { status: 400 });
    }

    const orderList = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    const order = orderList[0];
    if (order.buyerId !== userId) {
      return NextResponse.json({ success: false, error: '只有买家可以归还账号' }, { status: 403 });
    }

    if (order.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: `当前订单状态不能归还：${order.status}`,
        },
        { status: 400 },
      );
    }

    if (order.isSettled) {
      return NextResponse.json(
        { success: false, error: '订单已分账，不能重复操作' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await db
      .update(orders)
      .set({
        status: 'pending_verification',
        actualEndTime: now,
        verificationRequestTime: now,
        verificationDeadline: deadline,
        verificationResult: 'pending',
        updatedAt: now,
      })
      .where(eq(orders.id, id));

    return NextResponse.json({
      success: true,
      message: '账号归还成功，等待卖家验号',
      data: {
        orderId: id,
        orderNo: order.orderNo,
        status: 'pending_verification',
        verificationDeadline: deadline,
        note: '卖家验号通过后将自动完成并分账，若发现异常可发起纠纷。',
      },
    });
  } catch (error: any) {
    console.error('完成订单失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '完成订单失败',
      },
      { status: 500 },
    );
  }
}
