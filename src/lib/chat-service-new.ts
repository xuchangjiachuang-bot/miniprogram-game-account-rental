import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { accounts, chatMessages, db, groupChatMembers, groupChats, orders, users } from '@/lib/db';
import { ensurePlatformCustomerServiceMember } from '@/lib/platform-customer-service-user';

export interface ChatGroupMemberSummary {
  id: string;
  name: string;
  avatar?: string;
  role: 'buyer' | 'seller' | 'admin';
}

export interface ChatGroupSummary {
  id: string;
  orderId: string;
  orderTitle: string;
  members: ChatGroupMemberSummary[];
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    content: string;
    sender: string;
    time: string;
  };
}

export interface ChatMessageSummary {
  id: string;
  senderId: string;
  senderType: 'buyer' | 'seller' | 'admin' | 'system';
  senderName: string;
  senderAvatar?: string;
  content: string;
  fileKey?: string;
  imageUrl?: string;
  messageType: 'text' | 'image' | 'system';
  createdAt: string;
}

type ChatMemberRole = 'buyer' | 'seller' | 'admin';

function buildChatMessageImageUrl(messageId: string) {
  return `/api/chat/messages/${encodeURIComponent(messageId)}/image`;
}

function normalizeMessagePreview(content: string, messageType?: string | null) {
  if (messageType === 'image') {
    return '[图片]';
  }

  return content;
}

function getGroupSortTime(group: { updatedAt?: string | null; createdAt?: string | null }) {
  return group.updatedAt || group.createdAt || '';
}

function dedupeGroupsByOrder<T extends { id: string; orderId: string; updatedAt?: string | null; createdAt?: string | null }>(groups: T[]) {
  const sorted = [...groups].sort((a, b) => getGroupSortTime(b).localeCompare(getGroupSortTime(a)));
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const group of sorted) {
    const key = group.orderId || group.id;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(group);
  }

  return deduped;
}

async function getCanonicalOrderGroup(orderId: string) {
  const groups = await db
    .select()
    .from(groupChats)
    .where(eq(groupChats.orderId, orderId))
    .orderBy(desc(groupChats.updatedAt), desc(groupChats.createdAt));

  return groups[0] || null;
}

function formatUserName(
  user?: { nickname?: string | null; phone?: string | null },
  role?: string,
) {
  if (role === 'system') {
    return '系统';
  }

  if (user?.nickname) {
    return user.nickname;
  }

  if (user?.phone) {
    return user.phone;
  }

  if (role === 'buyer') {
    return '买家';
  }

  if (role === 'seller') {
    return '卖家';
  }

  if (role === 'admin') {
    return '客服';
  }

  return '系统';
}

function buildOrderChatTitle(accountTitle: string | null | undefined, orderNo: string) {
  return accountTitle?.trim() ? `${accountTitle} - 订单群聊` : `订单 ${orderNo} 群聊`;
}

async function getMembershipRecord(groupId: string, userId: string) {
  const result = await db
    .select()
    .from(groupChatMembers)
    .where(and(eq(groupChatMembers.groupChatId, groupId), eq(groupChatMembers.userId, userId)))
    .limit(1);

  return result[0] || null;
}

async function loadGroupMembers(groupId: string): Promise<ChatGroupMemberSummary[]> {
  const memberships = await db
    .select()
    .from(groupChatMembers)
    .where(eq(groupChatMembers.groupChatId, groupId));

  if (memberships.length === 0) {
    return [];
  }

  const userIds = memberships.map((membership) => membership.userId);
  const relatedUsers = await db
    .select({
      id: users.id,
      nickname: users.nickname,
      phone: users.phone,
      avatar: users.avatar,
    })
    .from(users)
    .where(inArray(users.id, userIds));

  const userMap = new Map(relatedUsers.map((user) => [user.id, user]));

  return memberships.map((membership) => {
    const user = userMap.get(membership.userId);

    return {
      id: membership.userId,
      name: formatUserName(user, membership.role),
      avatar: user?.avatar || undefined,
      role: membership.role as ChatMemberRole,
    };
  });
}

async function loadLastMessages(groupIds: string[]) {
  if (groupIds.length === 0) {
    return new Map<string, ChatGroupSummary['lastMessage']>();
  }

  const messages = await db
    .select({
      groupChatId: chatMessages.groupChatId,
      content: chatMessages.content,
      messageType: chatMessages.messageType,
      senderType: chatMessages.senderType,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(inArray(chatMessages.groupChatId, groupIds))
    .orderBy(desc(chatMessages.createdAt));

  const map = new Map<string, ChatGroupSummary['lastMessage']>();
  for (const message of messages) {
    if (!map.has(message.groupChatId)) {
      map.set(message.groupChatId, {
        content: normalizeMessagePreview(message.content, message.messageType),
        sender: message.senderType === 'system' ? '系统' : message.senderType,
        time: message.createdAt || '',
      });
    }
  }

  return map;
}

async function ensureSupportMemberForExistingGroup(groupId: string) {
  const supportMember = await ensurePlatformCustomerServiceMember({ groupChatId: groupId });

  if (supportMember.inserted) {
    await db.insert(chatMessages).values({
      groupChatId: groupId,
      senderId: supportMember.user.id,
      senderType: 'system',
      content: '订单群聊已创建，买卖双方可在这里沟通交易、使用、验号和售后问题。',
      messageType: 'system',
      createdAt: new Date().toISOString(),
    });
  }
}

export async function ensureOrderGroupChat(orderId: string): Promise<{
  id: string;
  orderId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}> {
  const existing = await getCanonicalOrderGroup(orderId);

  if (existing) {
    await ensureSupportMemberForExistingGroup(existing.id);
    return {
      ...existing,
      createdAt: existing.createdAt || '',
      updatedAt: existing.updatedAt || existing.createdAt || '',
    };
  }

  const orderRows = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      buyerId: orders.buyerId,
      sellerId: orders.sellerId,
      accountTitle: accounts.title,
    })
    .from(orders)
    .leftJoin(accounts, eq(accounts.id, orders.accountId))
    .where(eq(orders.id, orderId))
    .limit(1);

  const order = orderRows[0];
  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const now = new Date().toISOString();
  const title = buildOrderChatTitle(order.accountTitle, order.orderNo);

  const inserted = await db.transaction(async (tx) => {
    const duplicated = await tx.select().from(groupChats).where(eq(groupChats.orderId, orderId)).limit(1);

    if (duplicated[0]) {
      return {
        ...duplicated[0],
        createdAt: duplicated[0].createdAt || '',
        updatedAt: duplicated[0].updatedAt || duplicated[0].createdAt || '',
      };
    }

    const [group] = await tx
      .insert(groupChats)
      .values({
        orderId,
        title,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const supportMember = await ensurePlatformCustomerServiceMember({
      groupChatId: group.id,
      executor: tx,
      joinedAt: now,
    });

    await tx.insert(groupChatMembers).values([
      {
        groupChatId: group.id,
        userId: order.buyerId,
        role: 'buyer',
        joinedAt: now,
      },
      {
        groupChatId: group.id,
        userId: order.sellerId,
        role: 'seller',
        joinedAt: now,
      },
    ]);

    await tx.insert(chatMessages).values({
      groupChatId: group.id,
      senderId: supportMember.user.id,
      senderType: 'system',
      content: '订单群聊已创建，买卖双方可在这里沟通交易、使用、验号和售后问题。',
      messageType: 'system',
      createdAt: now,
    });

    return {
      ...group,
      createdAt: group.createdAt || '',
      updatedAt: group.updatedAt || group.createdAt || '',
    };
  });

  return {
    ...inserted,
    createdAt: inserted.createdAt || '',
    updatedAt: inserted.updatedAt || inserted.createdAt || '',
  };
}

export async function isUserInGroup(groupId: string, userId: string): Promise<boolean> {
  const membership = await getMembershipRecord(groupId, userId);
  return Boolean(membership);
}

export async function getGroupMembers(groupId: string): Promise<ChatGroupMemberSummary[]> {
  await ensureSupportMemberForExistingGroup(groupId);
  return loadGroupMembers(groupId);
}

export async function getUserGroups(userId: string): Promise<ChatGroupSummary[]> {
  const memberships = await db.select().from(groupChatMembers).where(eq(groupChatMembers.userId, userId));

  if (memberships.length === 0) {
    return [];
  }

  const groupIds = memberships.map((membership) => membership.groupChatId);
  const groups = await db
    .select()
    .from(groupChats)
    .where(inArray(groupChats.id, groupIds))
    .orderBy(desc(groupChats.updatedAt));

  const uniqueGroups = dedupeGroupsByOrder(groups);

  await Promise.all(uniqueGroups.map((group) => ensureSupportMemberForExistingGroup(group.id)));

  const lastMessageMap = await loadLastMessages(groupIds);

  const summaries = await Promise.all(
    uniqueGroups.map(async (group) => ({
      id: group.id,
      orderId: group.orderId,
      orderTitle: group.title,
      members: await loadGroupMembers(group.id),
      createdAt: group.createdAt || '',
      updatedAt: group.updatedAt || group.createdAt || '',
      lastMessage: lastMessageMap.get(group.id),
    })),
  );

  return summaries;
}

export async function getGroupForUser(groupId: string, userId: string): Promise<ChatGroupSummary | null> {
  const membership = await getMembershipRecord(groupId, userId);
  if (!membership) {
    return null;
  }

  await ensureSupportMemberForExistingGroup(groupId);

  const groups = await db.select().from(groupChats).where(eq(groupChats.id, groupId)).limit(1);
  const group = groups[0];
  if (!group) {
    return null;
  }

  const lastMessageMap = await loadLastMessages([groupId]);

  return {
    id: group.id,
    orderId: group.orderId,
    orderTitle: group.title,
    members: await loadGroupMembers(group.id),
    createdAt: group.createdAt || '',
    updatedAt: group.updatedAt || group.createdAt || '',
    lastMessage: lastMessageMap.get(group.id),
  };
}

export async function getMessage(messageId: string): Promise<ChatMessageSummary | null> {
  const messages = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      senderType: chatMessages.senderType,
      content: chatMessages.content,
      messageType: chatMessages.messageType,
      createdAt: chatMessages.createdAt,
      nickname: users.nickname,
      phone: users.phone,
      avatar: users.avatar,
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.senderId, users.id))
    .where(eq(chatMessages.id, messageId))
    .limit(1);

  const message = messages[0];
  if (!message) {
    return null;
  }

  return {
    id: message.id,
    senderId: message.senderId,
    senderType: (message.senderType || 'system') as ChatMessageSummary['senderType'],
    senderName: formatUserName(message, message.senderType),
    senderAvatar: message.senderType === 'system' ? undefined : message.avatar || undefined,
    content: message.messageType === 'image' ? '' : message.content,
    fileKey: message.messageType === 'image' ? message.content : undefined,
    imageUrl: message.messageType === 'image' ? buildChatMessageImageUrl(message.id) : undefined,
    messageType: (message.messageType || 'text') as ChatMessageSummary['messageType'],
    createdAt: message.createdAt || '',
  };
}

export async function getGroupMessagesForUser(
  groupId: string,
  userId: string,
  limit = 50,
): Promise<ChatMessageSummary[]> {
  const membership = await getMembershipRecord(groupId, userId);
  if (!membership) {
    throw new Error('CHAT_GROUP_FORBIDDEN');
  }

  await ensureSupportMemberForExistingGroup(groupId);

  const messages = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      senderType: chatMessages.senderType,
      content: chatMessages.content,
      messageType: chatMessages.messageType,
      createdAt: chatMessages.createdAt,
      nickname: users.nickname,
      phone: users.phone,
      avatar: users.avatar,
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.senderId, users.id))
    .where(eq(chatMessages.groupChatId, groupId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);

  return Promise.all(
    messages.map(async (message) => ({
      id: message.id,
      senderId: message.senderId,
      senderType: (message.senderType || 'system') as ChatMessageSummary['senderType'],
      senderName: formatUserName(message, message.senderType),
      senderAvatar: message.senderType === 'system' ? undefined : message.avatar || undefined,
      content: message.messageType === 'image' ? '' : message.content,
      fileKey: message.messageType === 'image' ? message.content : undefined,
      imageUrl: message.messageType === 'image' ? buildChatMessageImageUrl(message.id) : undefined,
      messageType: (message.messageType || 'text') as ChatMessageSummary['messageType'],
      createdAt: message.createdAt || '',
    })),
  );
}

export async function sendGroupMessageForUser(params: {
  groupId: string;
  userId: string;
  content: string;
  messageType?: 'text' | 'image';
}): Promise<ChatMessageSummary> {
  const membership = await getMembershipRecord(params.groupId, params.userId);
  if (!membership) {
    throw new Error('CHAT_GROUP_FORBIDDEN');
  }

  const content = params.content.trim();
  const messageType = params.messageType || 'text';

  if (!content) {
    throw new Error('CHAT_MESSAGE_EMPTY');
  }

  if (!['text', 'image'].includes(messageType)) {
    throw new Error('CHAT_MESSAGE_TYPE_UNSUPPORTED');
  }

  const now = new Date().toISOString();

  const [message] = await db
    .insert(chatMessages)
    .values({
      groupChatId: params.groupId,
      senderId: params.userId,
      senderType: membership.role as ChatMemberRole,
      content,
      messageType,
      createdAt: now,
    })
    .returning();

  await db.update(groupChats).set({ updatedAt: now }).where(eq(groupChats.id, params.groupId));

  const senderRows = await db
    .select({
      id: users.id,
      nickname: users.nickname,
      phone: users.phone,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  const sender = senderRows[0];

  return {
    id: message.id,
    senderId: message.senderId,
    senderType: message.senderType as ChatMessageSummary['senderType'],
    senderName: formatUserName(sender, message.senderType),
    senderAvatar: sender?.avatar || undefined,
    content: message.messageType === 'image' ? '' : message.content,
    fileKey: message.messageType === 'image' ? message.content : undefined,
    imageUrl: message.messageType === 'image' ? buildChatMessageImageUrl(message.id) : undefined,
    messageType: (message.messageType || 'text') as ChatMessageSummary['messageType'],
    createdAt: message.createdAt || now,
  };
}

export async function sendMessage(params: {
  groupChatId: string;
  userId: string;
  messageType?: 'text' | 'image' | 'system';
  content?: string;
}) {
  if (params.messageType && !['text', 'image'].includes(params.messageType)) {
    throw new Error('CHAT_MESSAGE_TYPE_UNSUPPORTED');
  }

  return sendGroupMessageForUser({
    groupId: params.groupChatId,
    userId: params.userId,
    content: params.content || '',
    messageType: (params.messageType as 'text' | 'image' | undefined) || 'text',
  });
}
