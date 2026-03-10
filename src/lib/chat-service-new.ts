/**
 * 聊天服务（新版）
 * 使用新的数据库表结构：groupChats, groupChatMembers, chatMessages
 */

import { chatManager } from '@/storage/database/chatManager';
import { getDb } from 'coze-coding-dev-sdk';
import { chatMessages, groupChatMembers, users } from '@/storage/database/shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '@/storage/database/shared/schema';

// ==================== 类型定义 ====================

export interface ChatGroup {
  id: string;
  orderId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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
}

// ==================== 群聊管理 ====================

/**
 * 创建群聊
 */
export async function createGroup(params: {
  orderId: string;
  title: string;
  buyerId: string;
  sellerId: string;
}): Promise<ChatGroup | null> {
  try {
    const groupChat = await chatManager.createGroupChat(params);
    return groupChat as unknown as ChatGroup;
  } catch (error) {
    console.error('创建群聊失败:', error);
    return null;
  }
}

/**
 * 获取用户的群聊列表
 */
export async function getUserGroups(userId: string): Promise<ChatGroup[]> {
  try {
    const groups = await chatManager.getUserGroupChats(userId);
    return groups as unknown as ChatGroup[];
  } catch (error) {
    console.error('获取用户群聊列表失败:', error);
    return [];
  }
}

/**
 * 获取群聊详情
 */
export async function getGroup(groupId: string): Promise<ChatGroup | null> {
  try {
    const groupChat = await chatManager.getGroupChatById(groupId);
    return groupChat as unknown as ChatGroup;
  } catch (error) {
    console.error('获取群聊详情失败:', error);
    return null;
  }
}

/**
 * 获取群聊成员
 */
export async function getGroupMembers(groupId: string): Promise<ChatGroupMember[]> {
  try {
    const members = await chatManager.getGroupChatMembers(groupId);
    return members as unknown as ChatGroupMember[];
  } catch (error) {
    console.error('获取群聊成员失败:', error);
    return [];
  }
}

/**
 * 检查用户是否在群聊中
 */
export async function isUserInGroup(groupId: string, userId: string): Promise<boolean> {
  try {
    const isMember = await chatManager.isGroupChatMember(groupId, userId);
    return isMember;
  } catch (error) {
    console.error('检查用户群聊成员状态失败:', error);
    return false;
  }
}

// ==================== 消息管理 ====================

export interface SendMessageParams {
  groupChatId: string;
  userId: string;
  messageType?: 'text' | 'image' | 'system';
  content?: string;
  senderType?: 'buyer' | 'seller' | 'admin';
}

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
    const message = await chatManager.sendMessage({
      groupChatId: params.groupChatId,
      senderId: params.userId,
      senderType: params.senderType || 'buyer',
      content: params.content || '',
      messageType: params.messageType || 'text',
    });

    return message as unknown as ChatMessage;
  } catch (error) {
    console.error('发送消息失败:', error);
    return null;
  }
}

/**
 * 获取群聊消息列表
 */
export async function getGroupMessages(
  groupId: string,
  limit: number = 50,
  beforeId?: string
): Promise<ChatMessage[]> {
  try {
    let messages = await chatManager.getMessages(groupId, { limit });

    // 如果有 beforeId，过滤掉该 ID 及之后的消息
    if (beforeId) {
      const index = messages.findIndex(m => m.id === beforeId);
      if (index !== -1) {
        messages = messages.slice(index + 1);
      }
    }

    return messages as unknown as ChatMessage[];
  } catch (error) {
    console.error('获取群聊消息列表失败:', error);
    return [];
  }
}

/**
 * 获取单条消息
 */
export async function getMessage(messageId: string): Promise<ChatMessage | null> {
  try {
    const db = await getDb(schema);
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    return message as unknown as ChatMessage || null;
  } catch (error) {
    console.error('获取消息失败:', error);
    return null;
  }
}
