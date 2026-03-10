import { NextRequest, NextResponse } from 'next/server';
import { getUnreadNotificationCount } from '@/lib/notification-service';

/**
 * 获取用户未读通知数量
 * GET /api/notifications/unread-count?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户ID不能为空'
      }, { status: 400 });
    }

    const result = await getUnreadNotificationCount(userId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('获取未读通知数量失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
