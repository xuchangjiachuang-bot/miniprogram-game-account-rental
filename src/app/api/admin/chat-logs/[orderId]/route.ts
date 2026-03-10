import { NextRequest, NextResponse } from 'next/server';
import { db, admins, orders, users, groupChats, chatMessages } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

/**
 * 获取订单聊天详情
 * GET /api/admin/chat-logs/[orderId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // 验证管理员权限
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

    // 查询订单详情
    const orderList = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNo, orderId))
      .limit(1);

    if (!orderList || orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    const order = orderList[0];

    // 查询聊天群
    const groupChatList = await db
      .select()
      .from(groupChats)
      .where(eq(groupChats.orderId, order.id))
      .limit(1);

    if (!groupChatList || groupChatList.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          orderId: order.orderNo,
          orderStatus: order.status,
          participants: {
            buyer: { id: order.buyerId, name: '未知' },
            seller: { id: order.sellerId, name: '未知' },
            admin: { id: adminList[0].id, name: adminList[0].username },
          },
          messages: [],
        },
      });
    }

    const groupChat = groupChatList[0];

    // 查询买家和卖家信息
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

    // 查询聊天消息
    const messageList = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.groupChatId, groupChat.id))
      .orderBy(desc(chatMessages.createdAt));

    // 获取所有发送者信息
    const senderIds = new Set<string>();
    messageList.forEach(msg => senderIds.add(msg.senderId));
    senderIds.add(order.buyerId);
    senderIds.add(order.sellerId);

    const userList = await db
      .select()
      .from(users)
      .where(eq(users.id, order.buyerId));

    const userMap = new Map(userList.map(u => [u.id, u]));

    // 格式化消息
    const messages = messageList.map(msg => {
      const sender = userMap.get(msg.senderId);
      return {
        id: msg.id,
        sender: msg.senderId,
        senderName: sender?.nickname || sender?.phone || '未知用户',
        senderType: msg.senderType,
        content: msg.content,
        timestamp: msg.createdAt,
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
