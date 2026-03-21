import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, messages } from '@/lib/db';
import { getServerUserId } from '@/lib/server-auth';
import { getUserById } from '@/lib/user-service';

export async function GET(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 },
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 },
      );
    }

    const unreadNotifications = await db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, user.id), eq(messages.isRead, false)));

    return NextResponse.json({
      success: true,
      count: unreadNotifications.length,
    });
  } catch (error: any) {
    console.error('获取未读通知数量失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取未读通知数量失败' },
      { status: 500 },
    );
  }
}
