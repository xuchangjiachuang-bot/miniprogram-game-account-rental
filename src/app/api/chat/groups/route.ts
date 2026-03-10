import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import {
  getGroup,
  getGroupMessages,
  sendMessage,
  getGroupMembers,
  createGroup,
  getUserGroups
} from '@/lib/chat-service-new';
import { chatManager } from '@/storage/database/chatManager';

/**
 * GET /api/chat/groups/:groupId
 * 获取群聊信息
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const groupId = pathname.split('/').pop();

    if (!groupId) {
      return NextResponse.json({ success: false, error: '群聊ID不能为空' }, { status: 400 });
    }

    const group = await getGroup(groupId);

    if (!group) {
      return NextResponse.json({ success: false, error: '群聊不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: group });
  } catch (error: any) {
    console.error('获取群聊信息失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/chat/groups
 * 创建群聊（仅用于订单）
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, title, buyerId, sellerId } = body;

    if (!orderId || !title || !buyerId || !sellerId) {
      return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 });
    }

    // 检查是否已经存在群聊
    const existingGroup = await chatManager.getGroupChatByOrderId(orderId);
    if (existingGroup) {
      return NextResponse.json({ success: true, data: existingGroup });
    }

    // 创建群聊
    const group = await createGroup({
      orderId,
      title,
      buyerId,
      sellerId
    });

    if (!group) {
      return NextResponse.json({ success: false, error: '创建群聊失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: group });
  } catch (error: any) {
    console.error('创建群聊失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
