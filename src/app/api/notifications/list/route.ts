import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import { getUserById } from '@/lib/user-service';
import { db, messages, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    // 获取分页参数
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 从数据库获取用户的通知
    const notificationList = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, user.id))
      .orderBy(messages.createdAt)
      .limit(limit)
      .offset(offset);

    // 获取总数
    const totalCount = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, user.id));

    // 转换数据格式
    const notifications = notificationList.map((msg: any) => ({
      id: msg.id,
      userId: msg.userId,
      user_id: msg.userId,
      type: msg.type,
      title: msg.title,
      content: msg.content,
      orderId: msg.orderId,
      order_id: msg.orderId,
      isRead: msg.isRead,
      is_read: msg.isRead,
      createdAt: msg.createdAt,
      created_at: msg.createdAt,
      readAt: msg.readAt,
      read_at: msg.readAt
    }));

    return NextResponse.json({
      success: true,
      notifications: notifications.reverse(), // 按时间倒序
      total: totalCount.length
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取通知列表失败'
    }, { status: 500 });
  }
}
