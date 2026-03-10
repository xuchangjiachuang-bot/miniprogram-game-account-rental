/**
 * 上架保证金服务
 * 管理账号上架保证金的冻结和退还
 */

import { db, accounts, userBalances, balanceTransactions, accountDeposits, platformSettings } from './db';
import { eq } from 'drizzle-orm';

// ==================== 类型定义 ====================

export interface DepositResult {
  success: boolean;
  message: string;
  deposit?: any;
}

// ==================== 上架保证金核心功能 ====================

/**
 * 冻结上架保证金
 * 账号上架时自动冻结保证金
 *
 * @param accountId 账号ID
 * @param userId 用户ID
 * @returns 冻结结果
 */
export async function freezeListingDeposit(
  accountId: string,
  userId: string
): Promise<DepositResult> {
  try {
    // 1. 获取账号信息
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (!accountList || accountList.length === 0) {
      return {
        success: false,
        message: '账号不存在'
      };
    }

    const account = accountList[0];

    // 检查是否已经有保证金记录
    if (account.depositId) {
      const existingDeposit = await db
        .select()
        .from(accountDeposits)
        .where(eq(accountDeposits.id, account.depositId));

      if (existingDeposit.length > 0 && existingDeposit[0].status === 'frozen') {
        return {
          success: false,
          message: '账号已有保证金记录'
        };
      }
    }

    // 2. 获取平台配置
    const settingsList = await db.select().from(platformSettings);
    const settings = settingsList[0] || {
      listingDepositAmount: 50 // 默认50元
    };

    const depositAmount = Number(settings.listingDepositAmount ?? 50);

    // 3. 检查用户余额是否足够
    const userBalancesList = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, userId));

    if (userBalancesList.length === 0) {
      return {
        success: false,
        message: '用户余额记录不存在'
      };
    }

    const userBalance = userBalancesList[0];
    const availableBalance = Number(userBalance.availableBalance) || 0;

    if (availableBalance < depositAmount) {
      return {
        success: false,
        message: `可用余额不足，需要保证金￥${depositAmount}，当前余额￥${availableBalance}`
      };
    }

    // 4. 开始事务
    await db.transaction(async (tx) => {
      // 4.1 冻结用户余额
      const oldAvailable = Number(userBalance.availableBalance) || 0;
      const oldFrozen = Number(userBalance.frozenBalance) || 0;
      const newAvailable = oldAvailable - depositAmount;
      const newFrozen = oldFrozen + depositAmount;

      await tx
        .update(userBalances)
        .set({
          availableBalance: newAvailable.toString(),
          frozenBalance: newFrozen.toString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(userBalances.userId, userId));

      // 4.2 记录余额变动
      await tx.insert(balanceTransactions).values({
        id: crypto.randomUUID(),
        userId: userId,
        transactionType: 'listing_deposit_freeze',
        amount: depositAmount.toString(),
        balanceBefore: oldAvailable.toString(),
        balanceAfter: newAvailable.toString(),
        description: `账号上架保证金冻结，账号ID：${accountId}`,
        createdAt: new Date().toISOString()
      });

      // 4.3 创建保证金记录
      const depositId = crypto.randomUUID();
      await tx.insert(accountDeposits).values({
        id: depositId,
        accountId: accountId,
        userId: userId,
        amount: depositAmount.toString(),
        status: 'frozen',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4.4 更新账号的保证金ID
      await tx
        .update(accounts)
        .set({
          depositId: depositId,
          updatedAt: new Date().toISOString()
        })
        .where(eq(accounts.id, accountId));
    });

    return {
      success: true,
      message: `保证金冻结成功，金额￥${depositAmount}`,
      deposit: {
        accountId,
        userId,
        amount: depositAmount,
        status: 'frozen'
      }
    };
  } catch (error: any) {
    console.error('冻结保证金失败:', error);
    return {
      success: false,
      message: error.message || '冻结保证金失败'
    };
  }
}

/**
 * 退还上架保证金
 * 账号下架或订单完成后自动退还保证金
 *
 * @param accountId 账号ID
 * @param reason 退还原因（cancelled, completed, rejected）
 * @returns 退还结果
 */
export async function refundListingDeposit(
  accountId: string,
  reason: 'cancelled' | 'completed' | 'rejected'
): Promise<DepositResult> {
  try {
    // 1. 获取账号信息
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (!accountList || accountList.length === 0) {
      return {
        success: false,
        message: '账号不存在'
      };
    }

    const account = accountList[0];

    // 检查是否有保证金记录
    if (!account.depositId) {
      return {
        success: false,
        message: '账号没有保证金记录'
      };
    }

    // 2. 获取保证金记录
    const depositList = await db
      .select()
      .from(accountDeposits)
      .where(eq(accountDeposits.id, account.depositId!));

    if (depositList.length === 0) {
      return {
        success: false,
        message: '保证金记录不存在'
      };
    }

    const deposit = depositList[0];

    // 检查保证金状态
    if (deposit.status !== 'frozen') {
      return {
        success: false,
        message: `保证金状态异常，当前状态：${deposit.status}`
      };
    }

    const depositAmount = Number(deposit.amount) || 0;

    // 3. 开始事务
    await db.transaction(async (tx) => {
      // 3.1 解冻用户余额
      const userBalancesList = await tx
        .select()
        .from(userBalances)
        .where(eq(userBalances.userId, account.sellerId));

      if (userBalancesList.length > 0) {
        const userBalance = userBalancesList[0];
        const oldAvailable = Number(userBalance.availableBalance) || 0;
        const oldFrozen = Number(userBalance.frozenBalance) || 0;
        const newAvailable = oldAvailable + depositAmount;
        const newFrozen = oldFrozen - depositAmount;

        await tx
          .update(userBalances)
          .set({
            availableBalance: newAvailable.toString(),
            frozenBalance: newFrozen.toString(),
            updatedAt: new Date().toISOString()
          })
          .where(eq(userBalances.userId, account.sellerId));

        // 记录余额变动
        await tx.insert(balanceTransactions).values({
          id: crypto.randomUUID(),
          userId: account.sellerId,
          transactionType: 'listing_deposit_refund',
          amount: depositAmount.toString(),
          balanceBefore: oldAvailable.toString(),
          balanceAfter: newAvailable.toString(),
          description: `账号保证金退还，原因：${reason}，账号ID：${accountId}`,
          createdAt: new Date().toISOString()
        });
      }

      // 3.2 更新保证金记录
      await tx
        .update(accountDeposits)
        .set({
          status: 'released',
          refundReason: reason,
          refundedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(accountDeposits.id, account.depositId!));
    });

    return {
      success: true,
      message: `保证金退还成功，金额￥${depositAmount}，原因：${reason}`,
      deposit: {
        accountId,
        userId: account.sellerId,
        amount: depositAmount,
        status: 'released',
        refundReason: reason
      }
    };
  } catch (error: any) {
    console.error('退还保证金失败:', error);
    return {
      success: false,
      message: error.message || '退还保证金失败'
    };
  }
}

/**
 * 获取账号保证金信息
 *
 * @param accountId 账号ID
 * @returns 保证金信息
 */
export async function getAccountDeposit(accountId: string) {
  try {
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (!accountList || accountList.length === 0) {
      return {
        success: false,
        error: '账号不存在'
      };
    }

    const account = accountList[0];

    if (!account.depositId) {
      return {
        success: true,
        data: {
          hasDeposit: false,
          deposit: null
        }
      };
    }

    const depositList = await db
      .select()
      .from(accountDeposits)
      .where(eq(accountDeposits.id, account.depositId));

    if (depositList.length === 0) {
      return {
        success: true,
        data: {
          hasDeposit: false,
          deposit: null
        }
      };
    }

    return {
      success: true,
      data: {
        hasDeposit: true,
        deposit: depositList[0]
      }
    };
  } catch (error: any) {
    console.error('获取保证金信息失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取用户保证金列表
 *
 * @param userId 用户ID
 * @returns 保证金列表
 */
export async function getUserDeposits(userId: string) {
  try {
    const deposits = await db
      .select()
      .from(accountDeposits)
      .where(eq(accountDeposits.userId, userId));

    return {
      success: true,
      data: deposits
    };
  } catch (error: any) {
    console.error('获取用户保证金列表失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取平台配置的上架保证金金额
 *
 * @returns 保证金金额
 */
export async function getListingDepositAmount(): Promise<number> {
  try {
    const settingsList = await db.select().from(platformSettings);
    const settings = settingsList[0] || {
      listingDepositAmount: 50
    };

    return Number(settings.listingDepositAmount ?? 50);
  } catch (error) {
    console.error('获取保证金金额失败:', error);
    return 50; // 默认50元
  }
}
