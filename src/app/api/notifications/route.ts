import { NextRequest, NextResponse } from 'next/server';
import { getUserNotifications, markAllNotificationsAsRead } from '@/lib/notification-service';

/**
 * 获取用户通知列表
 * GET /api/notifications
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const includeRead = searchParams.get('includeRead') === 'true';

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户ID不能为空'
      }, { status: 400 });
    }

    const result = await getUserNotifications(userId, includeRead);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('获取用户通知列表失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 标记所有通知为已读
 * PUT /api/notifications/mark-all-read
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户ID不能为空'
      }, { status: 400 });
    }

    const result = await markAllNotificationsAsRead(userId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('标记所有通知为已读失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
