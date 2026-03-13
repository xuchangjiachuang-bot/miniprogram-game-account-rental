import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, orders } from '@/lib/db';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';
import { ensureOrderGroupChat } from '@/lib/chat-service-new';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: '登录状态已失效，请重新登录' }, { status: 401 });
    }

    const body = await request.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!orderId) {
      return NextResponse.json({ success: false, error: '缺少订单ID' }, { status: 400 });
    }

    const orderRows = await db
      .select({
        id: orders.id,
      })
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.buyerId, user.id),
      ))
      .limit(1);

    if (!orderRows[0]) {
      return NextResponse.json({ success: false, error: '无权为该订单创建群聊' }, { status: 403 });
    }

    const group = await ensureOrderGroupChat(orderId);
    return NextResponse.json({ success: true, data: group });
  } catch (error: any) {
    console.error('[POST /api/chat/groups] Error:', error);
    return NextResponse.json({ success: false, error: error.message || '创建群聊失败' }, { status: 500 });
  }
}
