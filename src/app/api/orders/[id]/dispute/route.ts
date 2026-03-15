import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createOrderDispute, getOrderDispute } from '@/lib/dispute-service';
import { db, orders } from '@/lib/db';
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
    const orderRows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    const order = orderRows[0];

    if (!order) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    if (![order.buyerId, order.sellerId].includes(userId)) {
      return NextResponse.json({ success: false, error: '无权查看该订单纠纷' }, { status: 403 });
    }

    const dispute = await getOrderDispute(id);

    return NextResponse.json({
      success: true,
      data: dispute,
    });
  } catch (error: any) {
    console.error('[Order Dispute] 获取纠纷失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取纠纷失败' },
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
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const evidence = body.evidence ?? null;
    const disputeType = typeof body.disputeType === 'string' ? body.disputeType.trim() : 'after_sale';

    if (!reason) {
      return NextResponse.json({ success: false, error: '请填写纠纷原因' }, { status: 400 });
    }

    const dispute = await createOrderDispute({
      orderId: id,
      initiatorId: userId,
      reason,
      evidence,
      disputeType,
    });

    return NextResponse.json({
      success: true,
      message: '纠纷已提交，平台将尽快介入处理',
      data: dispute,
    });
  } catch (error: any) {
    console.error('[Order Dispute] 创建纠纷失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建纠纷失败' },
      { status: 500 },
    );
  }
}
