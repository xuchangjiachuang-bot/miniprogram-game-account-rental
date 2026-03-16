import { NextRequest, NextResponse } from 'next/server';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';
import { getGroupMessagesForUser, sendGroupMessageForUser } from '@/lib/chat-service-new';

export const dynamic = 'force-dynamic';

function getGroupIdFromRequest(request: NextRequest) {
  const parts = request.nextUrl.pathname.split('/');
  return parts[parts.length - 2] || '';
}

async function getAuthenticatedUser(request: NextRequest) {
  const token = getServerToken(request);
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const groupId = getGroupIdFromRequest(request);
    if (!groupId) {
      return NextResponse.json({ success: false, error: '群聊ID不能为空' }, { status: 400 });
    }

    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 50), 1), 100);
    const messages = await getGroupMessagesForUser(groupId, user.id, limit);
    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    if (error.message === 'CHAT_GROUP_FORBIDDEN') {
      return NextResponse.json({ success: false, error: '无权查看该群聊' }, { status: 403 });
    }

    console.error('[GET /api/chat/groups/[groupId]/messages] Error:', error);
    return NextResponse.json({ success: false, error: error.message || '加载聊天记录失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const groupId = getGroupIdFromRequest(request);
    if (!groupId) {
      return NextResponse.json({ success: false, error: '群聊ID不能为空' }, { status: 400 });
    }

    const body = await request.json();
    const message = await sendGroupMessageForUser({
      groupId,
      userId: user.id,
      content: typeof body.content === 'string' ? body.content : '',
      messageType: body.messageType === 'image' ? 'image' : 'text',
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    if (error.message === 'CHAT_GROUP_FORBIDDEN') {
      return NextResponse.json({ success: false, error: '无权在该群聊发言' }, { status: 403 });
    }

    if (error.message === 'CHAT_MESSAGE_EMPTY') {
      return NextResponse.json({ success: false, error: '消息内容不能为空' }, { status: 400 });
    }

    if (error.message === 'CHAT_MESSAGE_TYPE_UNSUPPORTED') {
      return NextResponse.json({ success: false, error: '暂不支持该消息类型' }, { status: 400 });
    }

    console.error('[POST /api/chat/groups/[groupId]/messages] Error:', error);
    return NextResponse.json({ success: false, error: error.message || '发送消息失败' }, { status: 500 });
  }
}
