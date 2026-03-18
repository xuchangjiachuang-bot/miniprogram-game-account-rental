import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { admins, chatMessages, db, groupChatMembers } from '@/lib/db';
import { generateFileUrl } from '@/lib/storage-service';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

function getMessageIdFromRequest(request: NextRequest) {
  const parts = request.nextUrl.pathname.split('/');
  return parts[parts.length - 2] || '';
}

async function hasAdminAccess(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value;
  if (!adminToken) {
    return false;
  }

  const adminList = await db.select({ id: admins.id }).from(admins).where(eq(admins.id, adminToken)).limit(1);
  return adminList.length > 0;
}

async function getAuthenticatedUserId(request: NextRequest) {
  const token = getServerToken(request);
  if (!token) {
    return null;
  }

  const user = await verifyToken(token);
  return user?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    const messageId = getMessageIdFromRequest(request);
    if (!messageId) {
      return NextResponse.json({ success: false, error: '消息ID不能为空' }, { status: 400 });
    }

    const messageList = await db
      .select({
        id: chatMessages.id,
        groupChatId: chatMessages.groupChatId,
        content: chatMessages.content,
        messageType: chatMessages.messageType,
      })
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    const message = messageList[0];
    if (!message) {
      return NextResponse.json({ success: false, error: '消息不存在' }, { status: 404 });
    }

    if (message.messageType !== 'image') {
      return NextResponse.json({ success: false, error: '该消息不是图片消息' }, { status: 400 });
    }

    const isAdmin = await hasAdminAccess(request);
    if (!isAdmin) {
      const userId = await getAuthenticatedUserId(request);
      if (!userId) {
        return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
      }

      const membership = await db
        .select({ userId: groupChatMembers.userId })
        .from(groupChatMembers)
        .where(and(eq(groupChatMembers.groupChatId, message.groupChatId), eq(groupChatMembers.userId, userId)))
        .limit(1);

      if (membership.length === 0) {
        return NextResponse.json({ success: false, error: '无权查看该图片' }, { status: 403 });
      }
    }

    const imageUrl = await generateFileUrl(message.content, 3600);
    if (!imageUrl) {
      return NextResponse.json({ success: false, error: '图片不存在' }, { status: 404 });
    }

    return NextResponse.redirect(new URL(imageUrl, request.url), {
      status: 307,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[GET /api/chat/messages/[messageId]/image] Error:', error);
    return NextResponse.json({ success: false, error: error.message || '加载图片失败' }, { status: 500 });
  }
}
