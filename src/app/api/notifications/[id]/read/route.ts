import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import { getUserById } from '@/lib/user-service';
import { broadcastNotification } from '@/lib/sse-broadcaster';
import { getUnreadNotificationCount } from '@/lib/notification-service';
import { db, messages } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: notificationId } = await params;

    // 从数据库查找通知
    const notificationList = await db
      .select()
      .from(messages)
      .where(eq(messages.id, notificationId))
      .limit(1);

    const notification = notificationList[0];
    if (!notification) {
      return NextResponse.json({
        success: false,
        error: '通知不存在'
      }, { status: 404 });
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: '无权操作此通知'
      }, { status: 403 });
    }

    // 更新为已读
    await db
      .update(messages)
      .set({ isRead: true, readAt: new Date().toISOString() })
      .where(eq(messages.id, notificationId));

    // 广播未读数量更新
    const { count: unreadCount } = await getUnreadNotificationCount(user.id);
    broadcastNotification(
      user.id,
      {
        id: notificationId,
        type: 'read',
        title: '',
        content: '',
        createdAt: notification.createdAt || new Date().toISOString()
      },
      unreadCount || 0
    );

    return NextResponse.json({
      success: true,
      message: '标记成功'
    });
  } catch (error) {
    console.error('标记通知已读失败:', error);
    return NextResponse.json({
      success: false,
      error: '标记通知已读失败'
    }, { status: 500 });
  }
}
