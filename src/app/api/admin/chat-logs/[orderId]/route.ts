import { NextRequest, NextResponse } from 'next/server';
import { db, admins, orders, users, groupChats, chatMessages } from '@/lib/db';
import { desc, eq, inArray } from 'drizzle-orm';

/**
 * 获取订单聊天详情
 * GET /api/admin/chat-logs/[orderId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 });
    }

    const { orderId } = await params;

    const orderList = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNo, orderId))
      .limit(1);

    if (orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    const order = orderList[0];

    const groupChatList = await db
      .select()
      .from(groupChats)
      .where(eq(groupChats.orderId, order.id))
      .limit(1);

    const buyerList = await db
      .select()
      .from(users)
      .where(eq(users.id, order.buyerId))
      .limit(1);

    const sellerList = await db
      .select()
      .from(users)
      .where(eq(users.id, order.sellerId))
      .limit(1);

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
            admin: { id: adminList[0].id, name: adminList[0].username },
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

    const senderIds = Array.from(new Set([
      order.buyerId,
      order.sellerId,
      ...messageList.map((message) => message.senderId).filter(Boolean),
    ]));

    const relatedUsers = senderIds.length > 0
      ? await db
          .select()
          .from(users)
          .where(inArray(users.id, senderIds))
      : [];

    const userMap = new Map(relatedUsers.map((user) => [user.id, user]));

    const messages = messageList.map((message) => {
      const sender = userMap.get(message.senderId);
      const senderName = message.senderType === 'system'
        ? '系统'
        : sender?.nickname || sender?.phone || '未知用户';

      return {
        id: message.id,
        sender: message.senderId,
        senderName,
        senderType: message.senderType,
        content: message.content,
        timestamp: message.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderNo,
        orderStatus: order.status,
        participants: {
          buyer: {
            id: buyer?.id,
            name: buyer?.nickname || buyer?.phone || '未知',
          },
          seller: {
            id: seller?.id,
            name: seller?.nickname || seller?.phone || '未知',
          },
          admin: {
            id: adminList[0].id,
            name: adminList[0].username,
          },
        },
        messages,
      },
    });
  } catch (error: any) {
    console.error('获取聊天详情失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取聊天详情失败' },
      { status: 500 }
    );
  }
}
