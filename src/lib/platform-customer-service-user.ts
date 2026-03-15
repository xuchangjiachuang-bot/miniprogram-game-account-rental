import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, groupChatMembers, systemConfig, users, wecomCustomerService } from '@/lib/db';

const PLATFORM_CUSTOMER_SERVICE_CONFIG_KEY = 'platform_customer_service_user';
const PLATFORM_CUSTOMER_SERVICE_PHONE = 'platform_cs_user';

type DbExecutor = {
  select: typeof db.select;
  insert: typeof db.insert;
  update: typeof db.update;
};

async function loadConfiguredCustomerServiceProfile(executor: DbExecutor) {
  const rows = await executor.select().from(wecomCustomerService).limit(1);
  const config = rows[0];

  return {
    nickname: config?.kfName?.trim() || '平台客服',
    avatar: config?.kfAvatar || null,
  };
}

async function getConfiguredCustomerServiceUserId(executor: DbExecutor) {
  const rows = await executor
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, PLATFORM_CUSTOMER_SERVICE_CONFIG_KEY))
    .limit(1);

  const value = rows[0]?.configValue as { userId?: string } | null | undefined;
  return value?.userId || null;
}

async function saveConfiguredCustomerServiceUserId(executor: DbExecutor, userId: string) {
  const now = new Date().toISOString();
  const existing = await executor
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, PLATFORM_CUSTOMER_SERVICE_CONFIG_KEY))
    .limit(1);

  if (existing[0]) {
    await executor
      .update(systemConfig)
      .set({
        configValue: { userId },
        updatedAt: now,
      })
      .where(eq(systemConfig.configKey, PLATFORM_CUSTOMER_SERVICE_CONFIG_KEY));
    return;
  }

  await executor.insert(systemConfig).values({
    id: randomUUID(),
    configKey: PLATFORM_CUSTOMER_SERVICE_CONFIG_KEY,
    configValue: { userId },
    description: '平台客服群聊账号映射',
    createdAt: now,
    updatedAt: now,
  });
}

export async function ensurePlatformCustomerServiceUser(executor: DbExecutor = db) {
  const configuredId = await getConfiguredCustomerServiceUserId(executor);
  const profile = await loadConfiguredCustomerServiceProfile(executor);

  if (configuredId) {
    const rows = await executor.select().from(users).where(eq(users.id, configuredId)).limit(1);
    if (rows[0]) {
      const existing = rows[0];
      const nextNickname = profile.nickname || existing.nickname;
      const nextAvatar = profile.avatar ?? existing.avatar ?? null;

      if (existing.nickname !== nextNickname || (existing.avatar || null) !== nextAvatar) {
        await executor
          .update(users)
          .set({
            nickname: nextNickname,
            avatar: nextAvatar,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, existing.id));
      }

      return {
        id: existing.id,
        nickname: nextNickname,
        avatar: nextAvatar,
      };
    }
  }

  const existingByPhone = await executor
    .select()
    .from(users)
    .where(eq(users.phone, PLATFORM_CUSTOMER_SERVICE_PHONE))
    .limit(1);

  if (existingByPhone[0]) {
    const existing = existingByPhone[0];
    await saveConfiguredCustomerServiceUserId(executor, existing.id);

    const nextNickname = profile.nickname || existing.nickname;
    const nextAvatar = profile.avatar ?? existing.avatar ?? null;

    if (existing.nickname !== nextNickname || (existing.avatar || null) !== nextAvatar) {
      await executor
        .update(users)
        .set({
          nickname: nextNickname,
          avatar: nextAvatar,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, existing.id));
    }

    return {
      id: existing.id,
      nickname: nextNickname,
      avatar: nextAvatar,
    };
  }

  const now = new Date().toISOString();
  const userId = randomUUID();

  await executor.insert(users).values({
    id: userId,
    phone: PLATFORM_CUSTOMER_SERVICE_PHONE,
    nickname: profile.nickname,
    avatar: profile.avatar,
    userType: 'buyer',
    isVerified: true,
    status: 'active',
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });

  await saveConfiguredCustomerServiceUserId(executor, userId);

  return {
    id: userId,
    nickname: profile.nickname,
    avatar: profile.avatar,
  };
}

export async function ensurePlatformCustomerServiceMember(params: {
  groupChatId: string;
  executor?: DbExecutor;
  joinedAt?: string;
}) {
  const executor = params.executor || db;
  const joinedAt = params.joinedAt || new Date().toISOString();
  const supportUser = await ensurePlatformCustomerServiceUser(executor);

  const existing = await executor
    .select()
    .from(groupChatMembers)
    .where(eq(groupChatMembers.groupChatId, params.groupChatId));

  const member = existing.find((item) => item.userId === supportUser.id);
  if (member) {
    return {
      user: supportUser,
      inserted: false,
    };
  }

  await executor.insert(groupChatMembers).values({
    groupChatId: params.groupChatId,
    userId: supportUser.id,
    role: 'admin',
    joinedAt,
  });

  return {
    user: supportUser,
    inserted: true,
  };
}
