import { eq, and, desc, inArray, gt } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { groupChats, chatMessages, groupChatMembers } from "./shared/schema";
import * as schema from "./shared/schema";

type GroupChat = typeof groupChats.$inferSelect;
type ChatMessage = typeof chatMessages.$inferSelect;
type GroupChatMember = typeof groupChatMembers.$inferSelect;

/**
 * 聊天管理器
 * 用于管理订单相关的聊天群和消息
 */
export class ChatManager {
  /**
   * 创建聊天群
   */
  async createGroupChat(data: {
    orderId: string;
    title: string;
    buyerId: string;
    sellerId: string;
  }): Promise<GroupChat> {
    const db = await getDb(schema);
    const now = new Date().toISOString();

    // 创建聊天群
    const [groupChat] = await db
      .insert(groupChats)
      .values({
        orderId: data.orderId,
        title: data.title,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 添加买家为成员
    await db.insert(groupChatMembers).values({
      groupChatId: groupChat.id,
      userId: data.buyerId,
      role: 'buyer',
      joinedAt: now,
    });

    // 添加卖家为成员
    await db.insert(groupChatMembers).values({
      groupChatId: groupChat.id,
      userId: data.sellerId,
      role: 'seller',
      joinedAt: now,
    });

    // 添加系统消息
    await db.insert(chatMessages).values({
      groupChatId: groupChat.id,
      senderId: data.buyerId,
      senderType: 'system',
      content: `群聊已创建，买家和卖家可以开始交流`,
      messageType: 'system',
      createdAt: now,
    });

    return groupChat;
  }

  /**
   * 根据订单ID获取聊天群
   */
  async getGroupChatByOrderId(orderId: string): Promise<GroupChat | null> {
    const db = await getDb(schema);
    const [groupChat] = await db
      .select()
      .from(groupChats)
      .where(eq(groupChats.orderId, orderId))
      .limit(1);
    return groupChat || null;
  }

  /**
   * 根据ID获取聊天群
   */
  async getGroupChatById(id: string): Promise<GroupChat | null> {
    const db = await getDb(schema);
    const [groupChat] = await db
      .select()
      .from(groupChats)
      .where(eq(groupChats.id, id))
      .limit(1);
    return groupChat || null;
  }

  /**
   * 发送消息
   */
  async sendMessage(data: {
    groupChatId: string;
    senderId: string;
    senderType: 'buyer' | 'seller' | 'admin';
    content: string;
    messageType?: 'text' | 'image' | 'system';
  }): Promise<ChatMessage> {
    const db = await getDb(schema);
    const now = new Date().toISOString();

    // 插入消息
    const [message] = await db
      .insert(chatMessages)
      .values({
        groupChatId: data.groupChatId,
        senderId: data.senderId,
        senderType: data.senderType,
        content: data.content,
        messageType: data.messageType || 'text',
        createdAt: now,
      })
      .returning();

    // 更新聊天群的更新时间
    await db
      .update(groupChats)
      .set({ updatedAt: now })
      .where(eq(groupChats.id, data.groupChatId));

    return message;
  }

  /**
   * 获取聊天消息列表
   */
  async getMessages(
    groupChatId: string,
    options: {
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<ChatMessage[]> {
    const db = await getDb(schema);
    const { skip = 0, limit = 50 } = options;

    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.groupChatId, groupChatId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(skip);
  }

  /**
   * 获取用户的聊天群列表
   */
  async getUserGroupChats(userId: string): Promise<GroupChat[]> {
    const db = await getDb(schema);

    // 先查询用户是成员的聊天群ID
    const memberships = await db
      .select()
      .from(groupChatMembers)
      .where(eq(groupChatMembers.userId, userId));

    const groupChatIds = memberships.map((m) => m.groupChatId);

    if (groupChatIds.length === 0) {
      return [];
    }

    // 查询这些聊天群的详细信息
    const chats = await db
      .select()
      .from(groupChats)
      .where(inArray(groupChats.id, groupChatIds))
      .orderBy(desc(groupChats.updatedAt));

    return chats;
  }

  /**
   * 检查用户是否是聊天群成员
   */
  async isGroupChatMember(
    groupChatId: string,
    userId: string
  ): Promise<boolean> {
    const db = await getDb(schema);
    const [member] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, userId)
        )
      )
      .limit(1);

    return !!member;
  }

  /**
   * 获取聊天群成员列表
   */
  async getGroupChatMembers(
    groupChatId: string
  ): Promise<GroupChatMember[]> {
    const db = await getDb(schema);
    return db
      .select()
      .from(groupChatMembers)
      .where(eq(groupChatMembers.groupChatId, groupChatId));
  }

  /**
   * 获取未读消息数
   */
  async getUnreadCount(
    groupChatId: string,
    userId: string,
    lastReadAt?: string
  ): Promise<number> {
    const db = await getDb(schema);

    if (!lastReadAt) {
      // 如果没有最后阅读时间，返回0
      return 0;
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.groupChatId, groupChatId),
          gt(chatMessages.createdAt, lastReadAt)
        )
      );

    return messages.length;
  }

  /**
   * 更新聊天群标题
   */
  async updateGroupChatTitle(
    groupChatId: string,
    title: string
  ): Promise<GroupChat | null> {
    const db = await getDb(schema);
    const now = new Date().toISOString();

    const [updatedChat] = await db
      .update(groupChats)
      .set({
        title,
        updatedAt: now,
      })
      .where(eq(groupChats.id, groupChatId))
      .returning();

    return updatedChat || null;
  }
}

export const chatManager = new ChatManager();
