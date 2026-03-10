/**
 * 通知服务
 * 处理各种业务通知，如账号被租、订单状态变更等
 */

import { db, messages, orders, accounts, groupChats, groupChatMembers as groupChatMembersTable, users } from './db';
import { eq, and } from 'drizzle-orm';
import { broadcastNotification } from './sse-broadcaster';

// ==================== 类型定义 ====================

export interface NotificationParams {
  userId: string; // 接收通知的用户ID
  type: 'account_rented' | 'order_paid' | 'order_completed' | 'order_cancelled' | 'audit_approved' | 'audit_rejected';
  title: string;
  content: string;
  orderId?: string; // 关联订单ID
  extras?: {
    chatGroupId?: string; // 群聊ID
    chatInvitationLink?: string; // 群聊邀请链接
    qrCodeUrl?: string; // 扫码登录URL
    loginInfo?: any; // 登录信息
    accountInfo?: any; // 账号信息
    orderInfo?: any; // 订单信息
    buyerInfo?: any; // 买家信息
  };
}

export interface SendAccountRentedNotificationParams {
  orderId: string;
  chatGroupId?: string; // 如果有群聊，传入群聊ID
  qrCodeUrl?: string; // 扫码登录URL
}

export interface NotificationResult {
  success: boolean;
  message: string;
  notification?: any;
}

// ==================== 通知服务核心功能 ====================

/**
 * 发送通知
 *
 * @param params 通知参数
 * @returns 发送结果
 */
export async function sendNotification(params: NotificationParams): Promise<NotificationResult> {
  try {
    // 插入通知记录
    const [notification] = await db.insert(messages).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      content: params.content,
      orderId: params.orderId,
      isRead: false,
      createdAt: new Date().toISOString()
    }).returning();

    // 获取用户未读通知数量
    const unreadList = await db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, params.userId), eq(messages.isRead, false)));
    const unreadCount = unreadList.length;

    // 触发SSE广播
    try {
      broadcastNotification(params.userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        orderId: notification.orderId as string | undefined,
        createdAt: notification.createdAt as string
      }, unreadCount);
    } catch (sseError) {
      // SSE广播失败不影响通知发送成功
      console.error('SSE广播失败:', sseError);
    }

    return {
      success: true,
      message: '通知发送成功',
      notification
    };
  } catch (error: any) {
    console.error('发送通知失败:', error);
    return {
      success: false,
      message: error.message || '发送通知失败'
    };
  }
}

/**
 * 发送账号被租通知（通知卖家）
 *
 * 通知内容包括：
 * - 订单信息
 * - 群聊信息（如果有）
 * - 扫码登录信息（如果有）
 *
 * @param params 通知参数
 * @returns 发送结果
 */
export async function sendAccountRentedNotification(
  params: SendAccountRentedNotificationParams
): Promise<NotificationResult> {
  try {
    // 1. 获取订单信息
    const orderList = await db.select().from(orders).where(eq(orders.id, params.orderId));

    if (!orderList || orderList.length === 0) {
      return {
        success: false,
        message: '订单不存在'
      };
    }

    const order = orderList[0];

    // 2. 获取账号信息
    const accountList = await db.select().from(accounts).where(eq(accounts.id, order.accountId));

    if (!accountList || accountList.length === 0) {
      return {
        success: false,
        message: '账号不存在'
      };
    }

    const account = accountList[0];

    // 3. 获取买家信息
    const buyerList = await db.select().from(users).where(eq(users.id, order.buyerId));

    if (!buyerList || buyerList.length === 0) {
      return {
        success: false,
        message: '买家信息不存在'
      };
    }

    const buyer = buyerList[0];

    // 4. 如果有群聊ID，获取群聊信息
    let chatGroupInfo = null;
    let chatInvitationLink = '';

    if (params.chatGroupId) {
      const groupList = await db.select().from(groupChats).where(eq(groupChats.id, params.chatGroupId));
      if (groupList.length > 0) {
        chatGroupInfo = groupList[0];
        // 生成群聊邀请链接（这里只是示例，实际需要根据你的IM系统实现）
        chatInvitationLink = `/chat/groups/${params.chatGroupId}`;
      }
    }

    // 5. 生成扫码登录URL（如果提供）
    let qrCodeUrl = params.qrCodeUrl;
    if (!qrCodeUrl) {
      // 如果没有提供扫码URL，生成一个默认的登录提示
      qrCodeUrl = `/api/orders/${order.id}/qrcode`;
    }

    // 6. 构建通知内容
    const title = '🎉 您的账号已被租赁！';

    let content = `亲爱的卖家：\n\n`;
    content += `您的账号「${account.title}」已被买家「${buyer.nickname}」租赁成功！\n\n`;
    content += `📋 订单信息：\n`;
    content += `• 订单号：${order.orderNo}\n`;
    content += `• 租期：${order.rentalDuration}小时\n`;
    content += `• 租金：￥${order.rentalPrice}\n`;
    content += `• 押金：￥${order.deposit}\n\n`;

    // 添加群聊信息
    if (chatGroupInfo) {
      content += `💬 群聊信息：\n`;
      content += `• 群名称：${chatGroupInfo.title}\n`;
      content += `• 群聊链接：${chatInvitationLink}\n`;
      content += `请尽快加入群聊，方便与买家沟通！\n\n`;
    }

    // 添加扫码登录信息
    if (qrCodeUrl) {
      content += `🔐 扫码登录：\n`;
      content += `• 请扫描下方二维码或点击链接进行扫码登录\n`;
      content += `• 登录链接：${qrCodeUrl}\n`;
      content += `• 登录后请确认买家身份\n\n`;
    }

    content += `⚠️ 注意事项：\n`;
    content += `1. 请妥善保管账号密码\n`;
    content += `2. 租期结束后请及时修改密码\n`;
    content += `3. 如遇问题请联系客服\n\n`;
    content += `感谢您的使用！`;

    // 7. 发送通知
    const notificationParams: NotificationParams = {
      userId: order.sellerId, // 通知卖家
      type: 'account_rented',
      title,
      content,
      orderId: order.id,
      extras: {
        chatGroupId: params.chatGroupId,
        qrCodeUrl,
        chatInvitationLink,
        accountInfo: {
          id: account.id,
          title: account.title,
          accountId: account.accountId
        },
        orderInfo: {
          orderNo: order.orderNo,
          rentalHours: order.rentalDuration,
          rentalPrice: order.rentalPrice,
          deposit: order.deposit
        },
        buyerInfo: {
          id: buyer.id,
          nickname: buyer.nickname
        }
      }
    };

    return await sendNotification(notificationParams);
  } catch (error: any) {
    console.error('发送账号被租通知失败:', error);
    return {
      success: false,
      message: error.message || '发送通知失败'
    };
  }
}

/**
 * 创建订单群聊
 *
 * 为订单创建群聊，方便买卖双方沟通
 *
 * @param orderId 订单ID
 * @param groupName 群名称
 * @returns 群聊信息
 */
export async function createOrderChatGroup(
  orderId: string,
  groupName?: string
): Promise<{ success: boolean; groupId?: string; error?: string }> {
  try {
    // 1. 获取订单信息
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!orderList || orderList.length === 0) {
      return {
        success: false,
        error: '订单不存在'
      };
    }

    const order = orderList[0];

    // 2. 获取账号信息
    const accountList = await db.select().from(accounts).where(eq(accounts.id, order.accountId));

    if (!accountList || accountList.length === 0) {
      return {
        success: false,
        error: '账号不存在'
      };
    }

    const account = accountList[0];

    // 3. 创建群聊
    const [group] = await db.insert(groupChats).values({
      orderId: orderId,
      title: groupName || `订单${order.orderNo}沟通群`,
    }).returning();

    // 4. 添加群成员
    await db.insert(groupChatMembersTable).values([
      {
        groupChatId: group.id,
        userId: order.buyerId,
        role: 'buyer',
      },
      {
        groupChatId: group.id,
        userId: order.sellerId,
        role: 'seller',
      }
    ]);

    // 5. 发送系统消息到群聊
    // 这里需要插入到chat_messages表
    // 简化实现，这里暂时省略

    return {
      success: true,
      groupId: group.id
    };
  } catch (error: any) {
    console.error('创建订单群聊失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 发送订单支付成功通知（同时触发账号被租通知）
 *
 * @param orderId 订单ID
 * @param createChatGroup 是否创建群聊（默认true）
 * @returns 通知结果
 */
export async function sendOrderPaidNotification(
  orderId: string,
  createChatGroup: boolean = true
): Promise<{
  success: boolean;
  message: string;
  chatGroupId?: string;
  notification?: any;
}> {
  try {
    // 1. 获取订单信息
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!orderList || orderList.length === 0) {
      return {
        success: false,
        message: '订单不存在'
      };
    }

    const order = orderList[0];

    // 2. 更新订单状态为已支付
    await db
      .update(orders)
      .set({
        status: 'paid',
        paymentTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(orders.id, orderId));

    let chatGroupId: string | undefined;

    // 3. 如果需要创建群聊
    if (createChatGroup) {
      const groupResult = await createOrderChatGroup(orderId);
      if (groupResult.success) {
        chatGroupId = groupResult.groupId;
      }
    }

    // 4. 生成扫码登录URL
    const qrCodeUrl = `/api/orders/${order.id}/qrcode`;

    // 5. 发送账号被租通知给卖家
    const notificationResult = await sendAccountRentedNotification({
      orderId,
      chatGroupId,
      qrCodeUrl
    });

    return {
      success: true,
      message: '订单支付成功，已发送通知',
      chatGroupId,
      notification: notificationResult.notification
    };
  } catch (error: any) {
    console.error('发送订单支付成功通知失败:', error);
    return {
      success: false,
      message: error.message || '发送通知失败'
    };
  }
}

/**
 * 获取用户通知列表
 *
 * @param userId 用户ID
 * @param includeRead 是否包含已读消息（默认false）
 * @returns 通知列表
 */
export async function getUserNotifications(
  userId: string,
  includeRead: boolean = false
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    let query;

    if (!includeRead) {
      // 只获取未读通知
      query = db.select().from(messages).where(
        and(
          eq(messages.userId, userId),
          eq(messages.isRead, false)
        )
      );
    } else {
      // 获取所有通知
      query = db.select().from(messages).where(eq(messages.userId, userId));
    }

    const notifications = await query
      .orderBy(messages.createdAt)
      .limit(50);

    return {
      success: true,
      data: notifications
    };
  } catch (error: any) {
    console.error('获取用户通知列表失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 标记通知为已读
 *
 * @param notificationId 通知ID
 * @returns 标记结果
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date().toISOString()
      })
      .where(eq(messages.id, notificationId));

    return {
      success: true,
      message: '通知已标记为已读'
    };
  } catch (error: any) {
    console.error('标记通知为已读失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 标记所有通知为已读
 *
 * @param userId 用户ID
 * @returns 标记结果
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 先统计未读数量
    const unreadNotifications = await db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.isRead, false)));

    const count = unreadNotifications.length;

    if (count > 0) {
      await db
        .update(messages)
        .set({
          isRead: true,
          readAt: new Date().toISOString()
        })
        .where(and(eq(messages.userId, userId), eq(messages.isRead, false)));

      // 标记所有通知为已读后，触发SSE广播（未读数量为0）
      try {
        broadcastNotification(userId, {
          id: '',
          type: 'mark_all_read',
          title: '所有通知已标记为已读',
          content: '',
          createdAt: new Date().toISOString()
        }, 0);
      } catch (sseError) {
        console.error('SSE广播失败:', sseError);
      }
    }

    return {
      success: true,
      count
    };
  } catch (error: any) {
    console.error('标记所有通知为已读失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


/**
 * 获取用户未读通知数量
 *
 * @param userId 用户ID
 * @returns 未读通知数量
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const unreadNotifications = await db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.isRead, false)));

    return {
      success: true,
      count: unreadNotifications.length
    };
  } catch (error: any) {
    console.error('获取未读通知数量失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
