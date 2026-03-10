import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import { getUserGroups } from '@/lib/chat-service-new';
import { chatManager } from '@/storage/database/chatManager';

/**
 * GET /api/chat/user-groups
 * 获取用户的群聊列表
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const groups = await getUserGroups(userId);

    // 转换为前端需要的格式
    const formattedGroups = await Promise.all(groups.map(async (group) => {
      // 获取最后一条消息
      const messages = await chatManager.getMessages(group.id, { limit: 1 });
      const lastMessage = messages.length > 0 ? {
        content: messages[0].content,
        sender: messages[0].senderType,
        time: messages[0].createdAt
      } : {
        content: '暂无消息',
        sender: '',
        time: ''
      };

      return {
        id: group.id,
        orderId: group.orderId,
        orderTitle: group.title,
        members: [], // 可以从数据库加载
        lastMessage,
        createdAt: group.createdAt
      };
    }));

    return NextResponse.json({ success: true, data: formattedGroups });
  } catch (error: any) {
    console.error('获取用户群聊失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
