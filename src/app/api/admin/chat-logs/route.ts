import { NextRequest, NextResponse } from 'next/server';
import { db, admins, orders, users, groupChats, chatMessages } from '@/lib/db';
import { eq, desc, and, like, count, sql, inArray } from 'drizzle-orm';

/**
 * 获取聊天记录列表（基于订单群聊）
 * GET /api/admin/chat-logs
 *
 * 查询参数：
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认20）
 * - status: 状态筛选（active, completed, disputed）
 * - search: 搜索关键词（订单号、买家、卖家）
 */
export async function GET(request: NextRequest) {
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

    const admin = adminList[0];
    if (admin.status !== 'active') {
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // 构建查询条件
    const conditions = [];

    if (status && status !== 'all') {
      if (status === 'active') {
        conditions.push(eq(orders.status, 'active'));
      } else if (status === 'completed') {
        conditions.push(eq(orders.status, 'completed'));
      } else if (status === 'disputed') {
        conditions.push(eq(orders.status, 'disputed'));
      }
    }

    if (search) {
      conditions.push(
        like(orders.orderNo, `%${search}%`)
      );
    }

    // 查询所有符合条件的订单
    let orderQuery = db
      .select()
      .from(orders);

    if (conditions.length > 0) {
      orderQuery = orderQuery.where(and(...conditions)) as any;
    }

    orderQuery = orderQuery.orderBy(desc(orders.createdAt)) as any;

    const filteredOrders = await orderQuery;

    if (filteredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        page,
        pageSize,
      });
    }

    const orderIds = filteredOrders.map(o => o.id);

    // 查询这些订单对应的聊天群
    const groupChatList = await db
      .select()
      .from(groupChats)
      .where(inArray(groupChats.orderId, orderIds))
      .orderBy(desc(groupChats.createdAt));

    // 如果没有聊天群，返回空数组
    if (groupChatList.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        page,
        pageSize,
      });
    }

    // 获取订单信息映射
    const orderMap = new Map(filteredOrders.map(o => [o.id, o]));

    // 收集所有用户ID
    const userIds = new Set<string>();
    groupChatList.forEach(chat => {
      const order = orderMap.get(chat.orderId);
      if (order) {
        userIds.add(order.buyerId);
        userIds.add(order.sellerId);
      }
    });

    // 只有在有用户ID时才查询用户信息
    let userList: any[] = [];
    if (userIds.size > 0) {
      userList = await db
        .select()
        .from(users)
        .where(inArray(users.id, Array.from(userIds)));
    }

    const userMap = new Map(userList.map(u => [u.id, u]));

    // 获取聊天群的消息统计
    const groupChatIds = groupChatList.map(chat => chat.id);
    const messageStats = await db
      .select({
        groupChatId: chatMessages.groupChatId,
        messageCount: count(chatMessages.id),
      })
      .from(chatMessages)
      .where(inArray(chatMessages.groupChatId, groupChatIds))
      .groupBy(chatMessages.groupChatId);

    const messageStatsMap = new Map(
      messageStats.map(stat => [stat.groupChatId, Number(stat.messageCount)])
    );

    // 获取每个聊天群的最后一条消息
    const lastMessages = await db
      .select({
        groupChatId: chatMessages.groupChatId,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(inArray(chatMessages.groupChatId, groupChatIds))
      .orderBy(desc(chatMessages.createdAt));

    // 为每个聊天群获取最后一条消息
    const lastMessageMap = new Map<string, { content: string; createdAt: string }>();
    const processedGroups = new Set<string>();
    
    lastMessages.forEach(msg => {
      if (!processedGroups.has(msg.groupChatId)) {
        lastMessageMap.set(msg.groupChatId, {
          content: msg.content,
          createdAt: msg.createdAt || new Date().toISOString()
        });
        processedGroups.add(msg.groupChatId);
      }
    });

    // 分页
    const offset = (page - 1) * pageSize;
    const paginatedChats = groupChatList.slice(offset, offset + pageSize);

    // 格式化返回数据
    const formattedChats = paginatedChats.map(chat => {
      const order = orderMap.get(chat.orderId);
      if (!order) return null;

      const buyer = userMap.get(order.buyerId);
      const seller = userMap.get(order.sellerId);
      const lastMsg = lastMessageMap.get(chat.id);

      return {
        id: chat.id,
        orderId: order.orderNo,
        buyer: buyer?.nickname || buyer?.phone || '未知',
        seller: seller?.nickname || seller?.phone || '未知',
        createdAt: chat.createdAt,
        lastMessage: lastMsg?.content || '群聊已创建',
        lastMessageTime: lastMsg?.createdAt || chat.updatedAt,
        messageCount: messageStatsMap.get(chat.id) || 0,
        status: order.status === 'active' ? 'active' :
                order.status === 'completed' ? 'completed' :
                order.status === 'disputed' ? 'disputed' : 'unknown',
      };
    }).filter(Boolean) as any[];

    return NextResponse.json({
      success: true,
      data: formattedChats,
      total: groupChatList.length,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('获取聊天记录失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取聊天记录失败' },
      { status: 500 }
    );
  }
}
