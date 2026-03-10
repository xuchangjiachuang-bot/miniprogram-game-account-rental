import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import { getGroupMessages, sendMessage } from '@/lib/chat-service-new';

export async function GET(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const parts = pathname.split('/');
    const groupId = parts[parts.length - 2];

    if (!groupId) {
      return NextResponse.json({ success: false, error: '群聊ID不能为空' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const beforeId = searchParams.get('beforeId') || undefined;

    const messages = await getGroupMessages(groupId, limit, beforeId);
    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('获取群聊消息失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const parts = pathname.split('/');
    const groupId = parts[parts.length - 2];

    if (!groupId) {
      return NextResponse.json({ success: false, error: '群聊ID不能为空' }, { status: 400 });
    }

    const body = await request.json();
    const content = (body.content || '').trim();
    const messageType = body.messageType || 'text';
    const senderType = body.senderType || 'buyer';

    if (!content) {
      return NextResponse.json({ success: false, error: '消息内容不能为空' }, { status: 400 });
    }

    const message = await sendMessage({
      groupChatId: groupId,
      userId,
      messageType,
      senderType,
      content,
    });

    if (!message) {
      return NextResponse.json({ success: false, error: '发送消息失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    console.error('发送群聊消息失败:', error);
    return NextResponse.json({ success: false, error: error.message || '发送消息失败' }, { status: 500 });
  }
}
