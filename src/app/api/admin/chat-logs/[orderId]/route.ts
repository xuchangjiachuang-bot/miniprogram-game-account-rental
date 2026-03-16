import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, inArray } from 'drizzle-orm';
import { admins, chatMessages, db, groupChats, orders, users } from '@/lib/db';
import { resolveStoredFileReference } from '@/lib/storage-service';
import { ensureOrderGroupChat, sendGroupMessageForUser } from '@/lib/chat-service-new';
import { ensurePlatformCustomerServiceUser } from '@/lib/platform-customer-service-user';

async function requireAdminToken(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value;
  if (!adminToken) {
    return { error: NextResponse.json({ success: false, error: '未登录' }, { status: 401 }) };
  }

  const adminList = await db.select().from(admins).where(eq(admins.id, adminToken)).limit(1);
  if (adminList.length === 0) {
    return { error: NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 }) };
  }

  return { admin: adminList[0] };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const auth = await requireAdminToken(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { orderId } = await params;
    const orderList = await db.select().from(orders).where(eq(orders.orderNo, orderId)).limit(1);
    if (orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    const order = orderList[0];
    const groupChatList = await db
      .select()
      .from(groupChats)
      .where(eq(groupChats.orderId, order.id))
      .orderBy(desc(groupChats.updatedAt), desc(groupChats.createdAt))
      .limit(1);

    const buyerList = await db.select().from(users).where(eq(users.id, order.buyerId)).limit(1);
    const sellerList = await db.select().from(users).where(eq(users.id, order.sellerId)).limit(1);
    const buyer = buyerList[0];
    const seller = sellerList[0];

    if (groupChatList.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          orderId: order.orderNo,
          orderStatus: order.status,
          participants: {
            buyer: { id: buyer?.id, name: buyer?.nickname || buyer?.phone || '未知' },
            seller: { id: seller?.id, name: seller?.nickname || seller?.phone || '未知' },
            admin: { id: auth.admin.id, name: auth.admin.username },
          },
          messages: [],
        },
      });
    }

    const groupChat = groupChatList[0];
    const messageList = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.groupChatId, groupChat.id))
      .orderBy(desc(chatMessages.createdAt));

    const senderIds = Array.from(
      new Set([
        order.buyerId,
        order.sellerId,
        ...messageList.map((message) => message.senderId).filter(Boolean),
      ]),
    );

    const relatedUsers =
      senderIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, senderIds))
        : [];
    const userMap = new Map(relatedUsers.map((user) => [user.id, user]));

    const messages = await Promise.all(
      messageList.map(async (message) => {
        const sender = userMap.get(message.senderId);
        return {
          id: message.id,
          sender: message.senderId,
          senderName:
            message.senderType === 'system' ? '系统' : sender?.nickname || sender?.phone || '未知用户',
          senderType: message.senderType,
          content:
            message.messageType === 'image'
              ? (await resolveStoredFileReference(message.content)) || message.content
              : message.content,
          messageType: message.messageType || 'text',
          timestamp: message.createdAt,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderNo,
        orderStatus: order.status,
        participants: {
          buyer: { id: buyer?.id, name: buyer?.nickname || buyer?.phone || '未知' },
          seller: { id: seller?.id, name: seller?.nickname || seller?.phone || '未知' },
          admin: { id: auth.admin.id, name: auth.admin.username },
        },
        messages,
      },
    });
  } catch (error: any) {
    console.error('获取聊天详情失败:', error);
    return NextResponse.json({ success: false, error: error.message || '获取聊天详情失败' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const auth = await requireAdminToken(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { orderId } = await params;
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const messageType = body.messageType === 'image' ? 'image' : 'text';

    if (!content) {
      return NextResponse.json({ success: false, error: '消息内容不能为空' }, { status: 400 });
    }

    const orderList = await db.select().from(orders).where(eq(orders.orderNo, orderId)).limit(1);
    if (orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    const order = orderList[0];
    const groupChat = await ensureOrderGroupChat(order.id);
    const supportUser = await ensurePlatformCustomerServiceUser();

    const message = await sendGroupMessageForUser({
      groupId: groupChat.id,
      userId: supportUser.id,
      content,
      messageType,
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    if (error.message === 'CHAT_GROUP_FORBIDDEN') {
      return NextResponse.json({ success: false, error: '客服暂无权限在该群聊发言' }, { status: 403 });
    }

    if (error.message === 'CHAT_MESSAGE_EMPTY') {
      return NextResponse.json({ success: false, error: '消息内容不能为空' }, { status: 400 });
    }

    if (error.message === 'CHAT_MESSAGE_TYPE_UNSUPPORTED') {
      return NextResponse.json({ success: false, error: '暂不支持该消息类型' }, { status: 400 });
    }

    console.error('管理员发送群聊消息失败:', error);
    return NextResponse.json({ success: false, error: error.message || '发送消息失败' }, { status: 500 });
  }
}
