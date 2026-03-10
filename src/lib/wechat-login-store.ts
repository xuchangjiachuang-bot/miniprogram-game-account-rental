// 微信登录状态存储 - 使用数据库存储
// 确保多实例环境下状态同步

import { db } from './db';
import { systemConfig } from '@/storage/database/shared/schema';
import { eq, or } from 'drizzle-orm';

interface LoginState {
  token?: string;
  loggedIn: boolean;
  createdAt: number;
}

// 状态过期时间（5分钟）
const STATE_EXPIRE_TIME = 5 * 60 * 1000;

/**
 * 保存登录状态到数据库
 */
export async function saveLoginState(state: string, token?: string): Promise<void> {
  const key = `wechat_login_${state}`;
  const value = JSON.stringify({
    token,
    loggedIn: true,
    createdAt: Date.now()
  });

  console.log('[登录状态存储] 开始保存, key:', key);

  try {
    // 先尝试更新
    const existing = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(systemConfig)
        .set({
          configValue: value,
          updatedAt: new Date().toISOString()
        })
        .where(eq(systemConfig.configKey, key));
      console.log('[登录状态存储] 更新成功, state:', state);
    } else {
      await db.insert(systemConfig).values({
        configKey: key,
        configValue: value,
        description: '微信扫码登录临时状态'
      });
      console.log('[登录状态存储] 插入成功, state:', state);
    }
  } catch (error) {
    console.error('[登录状态存储] 保存失败:', error);
    throw error;
  }

  // 清理过期状态（异步执行，不阻塞主流程）
  cleanupExpiredStates().catch(err => 
    console.error('[登录状态存储] 清理过期状态失败:', err)
  );
}

/**
 * 获取登录状态
 */
export async function getLoginState(state: string): Promise<LoginState | null> {
  const key = `wechat_login_${state}`;

  try {
    console.log('[登录状态存储] 查询, key:', key);
    
    const records = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, key))
      .limit(1);

    console.log('[登录状态存储] 查询结果:', records.length, '条');

    if (!records || records.length === 0) {
      return null;
    }

    const record = records[0];
    console.log('[登录状态存储] 原始数据:', record.configValue, '类型:', typeof record.configValue);
    
    // configValue 可能是字符串或对象，需要处理两种情况
    let data: LoginState;
    if (typeof record.configValue === 'string') {
      data = JSON.parse(record.configValue) as LoginState;
    } else {
      data = record.configValue as LoginState;
    }
    
    console.log('[登录状态存储] 解析后数据:', data);
    console.log('[登录状态存储] 时间检查: now=', Date.now(), 'createdAt=', data.createdAt, 'diff=', Date.now() - data.createdAt, 'expire=', STATE_EXPIRE_TIME);

    // 检查是否过期
    if (Date.now() - data.createdAt > STATE_EXPIRE_TIME) {
      console.log('[登录状态存储] 数据已过期，删除');
      // 删除过期状态
      await clearLoginState(state);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[登录状态存储] 获取失败:', error);
    return null;
  }
}

/**
 * 清除登录状态
 */
export async function clearLoginState(state: string): Promise<void> {
  const key = `wechat_login_${state}`;

  try {
    await db
      .delete(systemConfig)
      .where(eq(systemConfig.configKey, key));
    console.log('[登录状态存储] 已清除 state:', state);
  } catch (error) {
    console.error('[登录状态存储] 清除失败:', error);
  }
}

/**
 * 清理过期状态
 */
async function cleanupExpiredStates(): Promise<void> {
  try {
    // 获取所有微信登录状态
    const records = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.description, '微信扫码登录临时状态'));

    const now = Date.now();
    for (const record of records) {
      try {
        const data = JSON.parse(record.configValue as string) as LoginState;
        if (now - data.createdAt > STATE_EXPIRE_TIME) {
          await db
            .delete(systemConfig)
            .where(eq(systemConfig.configKey, record.configKey));
          console.log('[登录状态存储] 已清理过期状态:', record.configKey);
        }
      } catch {
        // 解析失败，直接删除
        await db
          .delete(systemConfig)
          .where(eq(systemConfig.configKey, record.configKey));
      }
    }
  } catch (error) {
    console.error('[登录状态存储] 清理过期状态失败:', error);
  }
}
