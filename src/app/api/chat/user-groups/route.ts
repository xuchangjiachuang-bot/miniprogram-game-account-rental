import { NextRequest, NextResponse } from 'next/server';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';
import { getUserGroups } from '@/lib/chat-service-new';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: '登录状态已失效，请重新登录' }, { status: 401 });
    }

    const groups = await getUserGroups(user.id);
    return NextResponse.json({ success: true, data: groups });
  } catch (error: any) {
    console.error('[GET /api/chat/user-groups] Error:', error);
    return NextResponse.json({ success: false, error: error.message || '加载群聊失败' }, { status: 500 });
  }
}
