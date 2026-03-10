/**
 * 群聊服务
 * 管理群聊、群成员、消息发送等功能
 */

import { db, groupChats, groupChatMembers, chatMessages, users } from './db';
import { eq, and, or, desc } from 'drizzle-orm';

// ==================== 类型定义 ====================

export interface ChatGroup {
  id: string;
  orderId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  members?: ChatGroupMember[];
}

export interface ChatGroupMember {
  id: string;
  groupChatId: string;
  userId: string;
  role: 'buyer' | 'seller' | 'admin';
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  groupChatId: string;
  senderId: string;
  senderType: 'buyer' | 'seller' | 'admin';
  content: string;
  messageType: 'text' | 'image' | 'system';
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    nickname: string;
    avatar?: string;
  };
}

export interface CreateGroupParams {
  groupName: string;
  groupType?: 'order' | 'platform' | 'custom';
  relatedOrderId?: string;
  creatorId: string;
  maxMembers?: number;
  avatar?: string;
  description?: string;
}

export interface SendMessageParams {
  groupChatId: string;
  userId: string;
  messageType?: 'text' | 'image' | 'system';
  content?: string;
  attachments?: any[];
  replyTo?: string;
}

// ==================== 群聊管理 ====================

/**
 * 创建群聊
 */
export async function createGroup(params: CreateGroupParams): Promise<ChatGroup | null> {
  try {
    // 创建群聊
    const [group] = await db.insert(groupChats).values({
      orderId: params.relatedOrderId || '',
      title: params.groupName || '群聊',
    }).returning();

    // 创建者自动加入群聊（作为 owner）
    await db.insert(groupChatMembers).values({
      groupChatId: group.id,
      userId: params.creatorId || '',
      role: 'owner',
    });

    return group as ChatGroup;
  } catch (error) {
    console.error('创建群聊失败:', error);
    return null;
  }
}

/**
 * 为订单创建群聊
 */
export async function createOrderChatGroup(orderId: string, orderTitle: string, buyerId: string, sellerId: string): Promise<ChatGroup | null> {
  try {
    // 创建群聊
    const group = await createGroup({
      groupName: `${orderTitle} - 订单沟通`,
      groupType: 'order',
      relatedOrderId: orderId,
      creatorId: sellerId, // 卖家创建群聊
      maxMembers: 5,
      description: `订单 ${orderId} 的沟通群聊`
    });

    if (!group) {
      throw new Error('创建群聊失败');
    }

    // 添加买家到群聊
    await db.insert(groupChatMembers).values({
      groupChatId: group.id,
      userId: buyerId,
      role: 'member',
      joinedAt: new Date().toISOString()
    });

    return group;
  } catch (error) {
    console.error('创建订单群聊失败:', error);
    return null;
  }
}

/**
 * 获取群聊信息
 */
export async function getGroup(groupChatId: string): Promise<ChatGroup | null> {
  try {
    const result = await db
      .select()
      .from(groupChats)
      .where(eq(groupChats.id, groupChatId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0] as ChatGroup;
  } catch (error) {
    console.error('获取群聊信息失败:', error);
    return null;
  }
}

/**
 * 根据订单ID获取群聊
 */
export async function getGroupByOrderId(orderId: string): Promise<ChatGroup | null> {
  try {
    const result = await db
      .select()
      .from(groupChats)
      .where(eq(groupChats.orderId, orderId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0] as ChatGroup;
  } catch (error) {
    console.error('获取订单群聊失败:', error);
    return null;
  }
}

/**
 * 获取用户的群聊列表
 */
export async function getUserGroups(userId: string): Promise<ChatGroup[]> {
  try {
    const result = await db
      .select({
        id: groupChats.id,
        orderId: groupChats.orderId,
        title: groupChats.title,
        createdAt: groupChats.createdAt,
        updatedAt: groupChats.updatedAt
      })
      .from(groupChats)
      .innerJoin(
        groupChatMembers,
        and(eq(groupChats.id, groupChatMembers.groupChatId), eq(groupChatMembers.userId, userId))
      );

    return result as ChatGroup[];
  } catch (error) {
    console.error('获取用户群聊列表失败:', error);
    return [];
  }
}

/**
 * 添加群成员
 */
export async function addGroupMember(groupChatId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<boolean> {
  try {
    await db.insert(groupChatMembers).values({
      groupChatId,
      userId,
      role,
      joinedAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('添加群成员失败:', error);
    return false;
  }
}

/**
 * 移除群成员
 */
export async function removeGroupMember(groupChatId: string, userId: string): Promise<boolean> {
  try {
    await db
      .delete(groupChatMembers)
      .where(and(
        eq(groupChatMembers.groupChatId, groupChatId),
        eq(groupChatMembers.userId, userId)
      ));

    return true;
  } catch (error) {
    console.error('移除群成员失败:', error);
    return false;
  }
}

/**
 * 检查用户是否在群聊中
 */
export async function isUserInGroup(groupChatId: string, userId: string): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(groupChatMembers)
      .where(and(
        eq(groupChatMembers.groupChatId, groupChatId),
        eq(groupChatMembers.userId, userId)
      ))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('检查群成员失败:', error);
    return false;
  }
}

/**
 * 获取群聊成员列表
 */
export async function getGroupMembers(groupChatId: string): Promise<ChatGroupMember[]> {
  try {
    const result = await db
      .select({
        id: groupChatMembers.id,
        groupChatId: groupChatMembers.groupChatId,
        userId: groupChatMembers.userId,
        role: groupChatMembers.role,
        joinedAt: groupChatMembers.joinedAt
      })
      .from(groupChatMembers)
      .where(eq(groupChatMembers.groupChatId, groupChatId));

    return result as ChatGroupMember[];
  } catch (error) {
    console.error('获取群聊成员列表失败:', error);
    return [];
  }
}

// ==================== 消息管理 ====================

/**
 * 发送消息
 */
export async function sendMessage(params: SendMessageParams): Promise<ChatMessage | null> {
  try {
    // 检查用户是否在群聊中
    const isInGroup = await isUserInGroup(params.groupChatId, params.userId);
    if (!isInGroup) {
      throw new Error('用户不在群聊中');
    }

    // 创建消息
    const [message] = await db.insert(chatMessages).values({
      groupChatId: params.groupChatId,
      senderId: params.userId,
      senderType: 'buyer',
      messageType: params.messageType || 'text',
      content: params.content || '',
    }).returning();

    return message as ChatMessage;
  } catch (error) {
    console.error('发送消息失败:', error);
    return null;
  }
}

/**
 * 获取群聊消息列表
 */
export async function getGroupMessages(
  groupChatId: string,
  limit: number = 50,
  beforeId?: string
): Promise<ChatMessage[]> {
  try {
    let query = db
      .select({
        id: chatMessages.id,
        groupChatId: chatMessages.groupChatId,
        senderId: chatMessages.senderId,
        senderType: chatMessages.senderType,
        messageType: chatMessages.messageType,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
        senderUsername: users.nickname,
        senderAvatar: users.avatar
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.groupChatId, groupChatId));

    // 如果指定了 beforeId，获取此消息之前的消息
    if (beforeId) {
      // 这里需要动态构建条件，简化处理
      const allMessages = await query.orderBy(desc(chatMessages.createdAt)).limit(limit + 50);
      const beforeIndex = allMessages.findIndex((m: any) => m.id === beforeId);
      if (beforeIndex !== -1) {
        return allMessages.slice(beforeIndex + 1, beforeIndex + limit + 1) as ChatMessage[];
      }
      return allMessages.slice(0, limit) as ChatMessage[];
    }

    const messages = await query.orderBy(desc(chatMessages.createdAt)).limit(limit);

    return messages.map((msg: any) => ({
      id: msg.id,
      groupChatId: msg.groupChatId,
      senderId: msg.senderId,
      senderType: msg.senderType,
      messageType: msg.messageType,
      content: msg.content,
      createdAt: msg.createdAt,
      sender: msg.senderId ? {
        id: msg.senderId,
        username: msg.senderUsername,
        nickname: msg.senderNickname,
        avatar: msg.senderAvatar
      } : undefined
    })) as ChatMessage[];
  } catch (error) {
    console.error('获取群聊消息失败:', error);
    return [];
  }
}

/**
 * 删除消息
 */
export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  try {
    await db
      .delete(chatMessages)
      .where(eq(chatMessages.id, messageId));

    return true;
  } catch (error) {
    console.error('删除消息失败:', error);
    return false;
  }
}

/**
 * 获取最新消息
 */
export async function getLatestMessage(groupChatId: string): Promise<ChatMessage | null> {
  try {
    const result = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.groupChatId, groupChatId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0] as ChatMessage;
  } catch (error) {
    console.error('获取最新消息失败:', error);
    return null;
  }
}

/**
 * 获取单条消息
 */
export async function getMessage(messageId: string): Promise<ChatMessage | null> {
  try {
    const result = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0] as ChatMessage;
  } catch (error) {
    console.error('获取消息失败:', error);
    return null;
  }
}

/**
 * 获取用户在群聊中的角色
 */
export async function getUserRole(groupChatId: string, userId: string): Promise<'owner' | 'admin' | 'member' | null> {
  try {
    const result = await db
      .select({ role: groupChatMembers.role })
      .from(groupChatMembers)
      .where(and(
        eq(groupChatMembers.groupChatId, groupChatId),
        eq(groupChatMembers.userId, userId)
      ))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0].role as 'owner' | 'admin' | 'member';
  } catch (error) {
    console.error('获取用户角色失败:', error);
    return null;
  }
}
