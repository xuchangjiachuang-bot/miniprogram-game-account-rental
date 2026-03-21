import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, messages } from '@/lib/db';
import { getServerUserId } from '@/lib/server-auth';
import { getUserById } from '@/lib/user-service';

export async function GET(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    const notificationList = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, user.id))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, user.id));

    const notifications = notificationList.map((message) => ({
      id: message.id,
      userId: message.userId,
      user_id: message.userId,
      type: message.type,
      title: message.title,
      content: message.content,
      orderId: message.orderId,
      order_id: message.orderId,
      isRead: message.isRead,
      is_read: message.isRead,
      createdAt: message.createdAt,
      created_at: message.createdAt,
      readAt: message.readAt,
      read_at: message.readAt,
    }));

    return NextResponse.json({
      success: true,
      notifications,
      total: totalCount.length,
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json({ success: false, error: '获取通知列表失败' }, { status: 500 });
  }
}
