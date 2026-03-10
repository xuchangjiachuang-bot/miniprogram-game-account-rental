/**
 * 账号服务
 * 提供账号相关的业务逻辑
 */

import { db } from './db';
import { accounts } from '../storage/database/shared/schema';
import { eq } from 'drizzle-orm';

// ==================== 类型定义 ====================

/**
 * 账号信息
 */
export interface Account {
  id: string;
  sellerId: string;
  accountId: string;
  title: string;
  description: string | null;
  screenshots: any;
  coinsM: number;
  safeboxCount: number;
  energyValue: number;
  staminaValue: number;
  hasSkins: boolean;
  skinTier: string | null;
  skinCount: number;
  hasBattlepass: boolean;
  battlepassLevel: number;
  customAttributes: any;
  tags: any;
  accountValue: number | null;
  recommendedRental: number | null;
  rentalRatio: number | null;
  deposit: number;
  totalPrice: number | null;
  rentalDays: number | null;
  rentalHours: number | null;
  rentalDescription: string | null;
  viewCount: number;
  tradeCount: number;
  status: string;
  auditStatus: string;
  auditReason: string | null;
  auditUserId: string | null;
  auditTime: string | null;
  depositId: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  listedAt: string | null;
}

// ==================== 账号查询函数 ====================

/**
 * 根据账号ID获取账号信息
 * @param accountId 账号ID（数据库中的id字段）
 * @returns 账号信息，如果不存在则返回null
 */
export async function getAccountById(accountId: string): Promise<Account | null> {
  try {
    const result = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const account = result[0];

    // 转换数据类型
    return {
      id: account.id,
      sellerId: account.sellerId,
      accountId: account.accountId,
      title: account.title,
      description: account.description,
      screenshots: account.screenshots,
      coinsM: parseFloat(account.coinsM.toString()),
      safeboxCount: account.safeboxCount || 0,
      energyValue: account.energyValue || 0,
      staminaValue: account.staminaValue || 0,
      hasSkins: account.hasSkins || false,
      skinTier: account.skinTier,
      skinCount: account.skinCount || 0,
      hasBattlepass: account.hasBattlepass || false,
      battlepassLevel: account.battlepassLevel || 0,
      customAttributes: account.customAttributes,
      tags: account.tags,
      accountValue: account.accountValue ? parseFloat(account.accountValue.toString()) : null,
      recommendedRental: account.recommendedRental ? parseFloat(account.recommendedRental.toString()) : null,
      rentalRatio: account.rentalRatio ? parseFloat(account.rentalRatio.toString()) : null,
      deposit: parseFloat(account.deposit.toString()),
      totalPrice: account.totalPrice ? parseFloat(account.totalPrice.toString()) : null,
      rentalDays: account.rentalDays ? parseFloat(account.rentalDays.toString()) : null,
      rentalHours: account.rentalHours ? parseFloat(account.rentalHours.toString()) : null,
      rentalDescription: account.rentalDescription,
      viewCount: account.viewCount || 0,
      tradeCount: account.tradeCount || 0,
      status: account.status || 'available',
      auditStatus: account.auditStatus || 'pending',
      auditReason: account.auditReason,
      auditUserId: account.auditUserId,
      auditTime: account.auditTime,
      depositId: account.depositId,
      isDeleted: account.isDeleted || false,
      createdAt: account.createdAt || new Date().toISOString(),
      updatedAt: account.updatedAt || new Date().toISOString(),
      listedAt: account.listedAt
    };
  } catch (error) {
    console.error('获取账号信息失败:', error);
    return null;
  }
}

/**
 * 根据账号编号获取账号信息
 * @param accountNo 账号编号（accountId字段）
 * @returns 账号信息，如果不存在则返回null
 */
export async function getAccountByNo(accountNo: string): Promise<Account | null> {
  try {
    const result = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountId, accountNo))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const account = result[0];

    // 转换数据类型
    return {
      id: account.id,
      sellerId: account.sellerId,
      accountId: account.accountId,
      title: account.title,
      description: account.description,
      screenshots: account.screenshots,
      coinsM: parseFloat(account.coinsM.toString()),
      safeboxCount: account.safeboxCount || 0,
      energyValue: account.energyValue || 0,
      staminaValue: account.staminaValue || 0,
      hasSkins: account.hasSkins || false,
      skinTier: account.skinTier,
      skinCount: account.skinCount || 0,
      hasBattlepass: account.hasBattlepass || false,
      battlepassLevel: account.battlepassLevel || 0,
      customAttributes: account.customAttributes,
      tags: account.tags,
      accountValue: account.accountValue ? parseFloat(account.accountValue.toString()) : null,
      recommendedRental: account.recommendedRental ? parseFloat(account.recommendedRental.toString()) : null,
      rentalRatio: account.rentalRatio ? parseFloat(account.rentalRatio.toString()) : null,
      deposit: parseFloat(account.deposit.toString()),
      totalPrice: account.totalPrice ? parseFloat(account.totalPrice.toString()) : null,
      rentalDays: account.rentalDays ? parseFloat(account.rentalDays.toString()) : null,
      rentalHours: account.rentalHours ? parseFloat(account.rentalHours.toString()) : null,
      rentalDescription: account.rentalDescription,
      viewCount: account.viewCount || 0,
      tradeCount: account.tradeCount || 0,
      status: account.status || 'available',
      auditStatus: account.auditStatus || 'pending',
      auditReason: account.auditReason,
      auditUserId: account.auditUserId,
      auditTime: account.auditTime,
      depositId: account.depositId,
      isDeleted: account.isDeleted || false,
      createdAt: account.createdAt || new Date().toISOString(),
      updatedAt: account.updatedAt || new Date().toISOString(),
      listedAt: account.listedAt
    };
  } catch (error) {
    console.error('获取账号信息失败:', error);
    return null;
  }
}

/**
 * 获取卖家的账号列表
 * @param sellerId 卖家ID
 * @param status 账号状态（可选）
 * @returns 账号列表
 */
export async function getSellerAccounts(sellerId: string, status?: string): Promise<Account[]> {
  try {
    let query = db
      .select()
      .from(accounts)
      .where(eq(accounts.sellerId, sellerId));

    // 如果指定了状态，添加状态过滤
    if (status) {
      // 注意：这里需要动态构建查询，Drizzle ORM 的方式
      // 简化实现，实际应该使用动态条件
      const result = await query as any[];
      return result.filter((acc: any) => acc.status === status);
    }

    const result = await query as any[];

    return result.map((account: any) => ({
      id: account.id,
      sellerId: account.sellerId,
      accountId: account.accountId,
      title: account.title,
      description: account.description,
      screenshots: account.screenshots,
      coinsM: parseFloat(account.coinsM.toString()),
      safeboxCount: account.safeboxCount || 0,
      energyValue: account.energyValue || 0,
      staminaValue: account.staminaValue || 0,
      hasSkins: account.hasSkins || false,
      skinTier: account.skinTier,
      skinCount: account.skinCount || 0,
      hasBattlepass: account.hasBattlepass || false,
      battlepassLevel: account.battlepassLevel || 0,
      customAttributes: account.customAttributes,
      tags: account.tags,
      accountValue: account.accountValue ? parseFloat(account.accountValue.toString()) : null,
      recommendedRental: account.recommendedRental ? parseFloat(account.recommendedRental.toString()) : null,
      rentalRatio: account.rentalRatio ? parseFloat(account.rentalRatio.toString()) : null,
      deposit: parseFloat(account.deposit.toString()),
      totalPrice: account.totalPrice ? parseFloat(account.totalPrice.toString()) : null,
      rentalDays: account.rentalDays ? parseFloat(account.rentalDays.toString()) : null,
      rentalHours: account.rentalHours ? parseFloat(account.rentalHours.toString()) : null,
      rentalDescription: account.rentalDescription,
      viewCount: account.viewCount || 0,
      tradeCount: account.tradeCount || 0,
      status: account.status || 'available',
      auditStatus: account.auditStatus || 'pending',
      auditReason: account.auditReason,
      auditUserId: account.auditUserId,
      auditTime: account.auditTime,
      depositId: account.depositId,
      isDeleted: account.isDeleted || false,
      createdAt: account.createdAt || new Date().toISOString(),
      updatedAt: account.updatedAt || new Date().toISOString(),
      listedAt: account.listedAt
    }));
  } catch (error) {
    console.error('获取卖家账号列表失败:', error);
    return [];
  }
}

/**
 * 更新账号状态
 * @param accountId 账号ID
 * @param newStatus 新状态
 * @returns 是否成功
 */
export async function updateAccountStatus(accountId: string, newStatus: string): Promise<boolean> {
  try {
    await db
      .update(accounts)
      .set({
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      .where(eq(accounts.id, accountId));

    return true;
  } catch (error) {
    console.error('更新账号状态失败:', error);
    return false;
  }
}

/**
 * 增加账号浏览次数
 * @param accountId 账号ID
 * @returns 是否成功
 */
export async function incrementAccountViewCount(accountId: string): Promise<boolean> {
  try {
    // 获取当前浏览次数
    const result = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    const currentViewCount = result[0].viewCount || 0;

    // 更新浏览次数
    await db
      .update(accounts)
      .set({
        viewCount: currentViewCount + 1,
        updatedAt: new Date().toISOString()
      })
      .where(eq(accounts.id, accountId));

    return true;
  } catch (error) {
    console.error('增加浏览次数失败:', error);
    return false;
  }
}

/**
 * 增加账号交易次数
 * @param accountId 账号ID
 * @returns 是否成功
 */
export async function incrementAccountTradeCount(accountId: string): Promise<boolean> {
  try {
    // 获取当前交易次数
    const result = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    const currentTradeCount = result[0].tradeCount || 0;

    // 更新交易次数
    await db
      .update(accounts)
      .set({
        tradeCount: currentTradeCount + 1,
        updatedAt: new Date().toISOString()
      })
      .where(eq(accounts.id, accountId));

    return true;
  } catch (error) {
    console.error('增加交易次数失败:', error);
    return false;
  }
}
