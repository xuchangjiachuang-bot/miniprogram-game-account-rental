/**
 * 用户余额服务
 * 管理用户余额、冻结余额、提现等操作
 */

import { db, userBalances, balanceTransactions, withdrawals, platformSettings } from './db';
import { eq, sql } from 'drizzle-orm';

// ==================== 类型定义 ====================

export interface UserBalance {
  userId: string;
  availableBalance: number;  // 可用余额
  frozenBalance: number;     // 冻结余额
  totalWithdrawn: number;    // 累计提现
  totalEarned: number;       // 累计收入
}

export interface BalanceUpdateResult {
  success: boolean;
  message: string;
  oldBalance: number;
  newBalance: number;
}

export interface WithdrawalResult {
  success: boolean;
  message: string;
  withdrawalId?: string;
  amount?: number;
  fee?: number;
  actualAmount?: number;
}

// ==================== 用户余额核心功能 ====================

/**
 * 获取用户余额
 *
 * @param userId 用户ID
 * @returns 用户余额信息
 */
export async function getUserBalance(userId: string): Promise<UserBalance | null> {
  try {
    const balanceList = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, userId));

    if (!balanceList || balanceList.length === 0) {
      return null;
    }

    const balance = balanceList[0];

    return {
      userId: balance.userId,
      availableBalance: Number(balance.availableBalance) || 0,
      frozenBalance: Number(balance.frozenBalance) || 0,
      totalWithdrawn: Number(balance.totalWithdrawn) || 0,
      totalEarned: Number(balance.totalEarned) || 0
    };
  } catch (error) {
    console.error('获取用户余额失败:', error);
    return null;
  }
}

/**
 * 增加用户可用余额
 *
 * @param userId 用户ID
 * @param amount 金额
 * @param description 描述
 * @returns 更新结果
 */
export async function addAvailableBalance(
  userId: string,
  amount: number,
  description: string = '余额增加'
): Promise<BalanceUpdateResult> {
  try {
    // 获取当前余额
    const balanceList = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, userId));

    if (!balanceList || balanceList.length === 0) {
      return {
        success: false,
        message: '用户余额记录不存在',
        oldBalance: 0,
        newBalance: 0
      };
    }

    const balance = balanceList[0];
    const oldBalance = Number(balance.availableBalance) || 0;
    const newBalance = oldBalance + amount;
    const oldTotalEarned = Number(balance.totalEarned) || 0;
    const newTotalEarned = oldTotalEarned + amount;

    // 更新余额
    await db
      .update(userBalances)
      .set({
        availableBalance: newBalance.toString(),
        totalEarned: newTotalEarned.toString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(userBalances.userId, userId));

    // 记录余额变动
    await db.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      userId: userId,
      transactionType: 'income',
      amount: amount.toString(),
      balanceBefore: oldBalance.toString(),
      balanceAfter: newBalance.toString(),
      description: description,
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      message: '余额增加成功',
      oldBalance,
      newBalance
    };
  } catch (error: any) {
    console.error('增加用户余额失败:', error);
    return {
      success: false,
      message: error.message || '余额增加失败',
      oldBalance: 0,
      newBalance: 0
    };
  }
}

/**
 * 冻结用户余额
 *
 * @param userId 用户ID
 * @param amount 金额
 * @param description 描述
 * @returns 更新结果
 */
export async function freezeBalance(
  userId: string,
  amount: number,
  description: string = '余额冻结'
): Promise<BalanceUpdateResult> {
  try {
    // 获取当前余额
    const balanceList = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, userId));

    if (!balanceList || balanceList.length === 0) {
      return {
        success: false,
        message: '用户余额记录不存在',
        oldBalance: 0,
        newBalance: 0
      };
    }

    const balance = balanceList[0];
    const oldAvailable = Number(balance.availableBalance) || 0;
    const oldFrozen = Number(balance.frozenBalance) || 0;

    // 检查余额是否足够
    if (oldAvailable < amount) {
      return {
        success: false,
        message: `可用余额不足，需要￥${amount}，当前￥${oldAvailable}`,
        oldBalance: oldAvailable,
        newBalance: oldAvailable
      };
    }

    const newAvailable = oldAvailable - amount;
    const newFrozen = oldFrozen + amount;

    // 更新余额
    await db
      .update(userBalances)
      .set({
        availableBalance: newAvailable.toString(),
        frozenBalance: newFrozen.toString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(userBalances.userId, userId));

    // 记录余额变动
    await db.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      userId: userId,
      transactionType: 'freeze',
      amount: amount.toString(),
      balanceBefore: oldAvailable.toString(),
      balanceAfter: newAvailable.toString(),
      description: description,
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      message: '余额冻结成功',
      oldBalance: oldAvailable,
      newBalance: newAvailable
    };
  } catch (error: any) {
    console.error('冻结用户余额失败:', error);
    return {
      success: false,
      message: error.message || '余额冻结失败',
      oldBalance: 0,
      newBalance: 0
    };
  }
}

/**
 * 解冻用户余额
 *
 * @param userId 用户ID
 * @param amount 金额
 * @param description 描述
 * @returns 更新结果
 */
export async function unfreezeBalance(
  userId: string,
  amount: number,
  description: string = '余额解冻'
): Promise<BalanceUpdateResult> {
  try {
    // 获取当前余额
    const balanceList = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, userId));

    if (!balanceList || balanceList.length === 0) {
      return {
        success: false,
        message: '用户余额记录不存在',
        oldBalance: 0,
        newBalance: 0
      };
    }

    const balance = balanceList[0];
    const oldAvailable = Number(balance.availableBalance) || 0;
    const oldFrozen = Number(balance.frozenBalance) || 0;

    // 检查冻结余额是否足够
    if (oldFrozen < amount) {
      return {
        success: false,
        message: `冻结余额不足，需要￥${amount}，当前￥${oldFrozen}`,
        oldBalance: oldAvailable,
        newBalance: oldAvailable
      };
    }

    const newAvailable = oldAvailable + amount;
    const newFrozen = oldFrozen - amount;

    // 更新余额
    await db
      .update(userBalances)
      .set({
        availableBalance: newAvailable.toString(),
        frozenBalance: newFrozen.toString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(userBalances.userId, userId));

    // 记录余额变动
    await db.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      userId: userId,
      transactionType: 'unfreeze',
      amount: amount.toString(),
      balanceBefore: oldAvailable.toString(),
      balanceAfter: newAvailable.toString(),
      description: description,
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      message: '余额解冻成功',
      oldBalance: oldAvailable,
      newBalance: newAvailable
    };
  } catch (error: any) {
    console.error('解冻用户余额失败:', error);
    return {
      success: false,
      message: error.message || '余额解冻失败',
      oldBalance: 0,
      newBalance: 0
    };
  }
}

/**
 * 申请提现
 *
 * @param userId 用户ID
 * @param amount 提现金额
 * @param accountInfo 账户信息（微信openid等）
 * @returns 提现结果
 */
export async function requestWithdrawal(
  userId: string,
  amount: number,
  accountInfo: any
): Promise<WithdrawalResult> {
  try {
    // 1. 获取平台配置
    const settingsList = await db.select().from(platformSettings);
    const settings = settingsList[0] || {
      withdrawalFee: 1
    };

    const withdrawalFeeRate = Number(settings.withdrawalFee) || 1;

    // 2. 计算手续费
    const fee = amount * (withdrawalFeeRate / 100);
    const actualAmount = amount - fee;

    // 3. 检查用户余额
    const balance = await getUserBalance(userId);
    if (!balance) {
      return {
        success: false,
        message: '用户余额记录不存在'
      };
    }

    if (balance.availableBalance < amount) {
      return {
        success: false,
        message: `可用余额不足，需要￥${amount}，当前￥${balance.availableBalance}`
      };
    }

    // 4. 开始事务
    await db.transaction(async (tx) => {
      // 4.1 冻结提现金额
      const freezeResult = await freezeBalance(userId, amount, '提现申请');

      if (!freezeResult.success) {
        throw new Error(freezeResult.message);
      }

      // 4.2 创建提现记录
      const withdrawalId = crypto.randomUUID();
      const withdrawalNo = `WD${Date.now()}${Math.floor(Math.random() * 1000)}`;

      await tx.insert(withdrawals).values({
        id: withdrawalId,
        withdrawalNo: withdrawalNo,
        userId: userId,
        username: '',  // TODO: 从用户表获取
        amount: amount.toString(),
        withdrawalFee: withdrawalFeeRate.toString(),
        feeAmount: fee.toString(),
        actualAmount: actualAmount.toString(),
        withdrawalType: 'wechat',
        accountInfo: JSON.stringify(accountInfo),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    return {
      success: true,
      message: '提现申请成功，等待审核',
      amount,
      fee,
      actualAmount
    };
  } catch (error: any) {
    console.error('申请提现失败:', error);
    return {
      success: false,
      message: error.message || '申请提现失败'
    };
  }
}

/**
 * 审核提现
 *
 * @param withdrawalId 提现ID
 * @param approved 是否通过
 * @param reviewerId 审核人ID
 * @param remark 备注
 * @returns 审核结果
 */
export async function reviewWithdrawal(
  withdrawalId: string,
  approved: boolean,
  reviewerId: string,
  remark: string = ''
): Promise<WithdrawalResult> {
  try {
    // 获取提现记录
    const withdrawalList = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId));

    if (!withdrawalList || withdrawalList.length === 0) {
      return {
        success: false,
        message: '提现记录不存在'
      };
    }

    const withdrawal = withdrawalList[0];

    // 检查提现状态
    if (withdrawal.status !== 'pending') {
      return {
        success: false,
        message: `提现状态不正确，当前状态：${withdrawal.status}`
      };
    }

    const amount = Number(withdrawal.amount) || 0;
    const actualAmount = Number(withdrawal.actualAmount) || 0;

    if (approved) {
      // 审核通过，执行转账
      await db.transaction(async (tx) => {
        // 1. 扣除冻结余额
        const unfreezeResult = await db
          .update(userBalances)
          .set({
            frozenBalance: sql`${userBalances.frozenBalance} - ${amount}`,
            updatedAt: new Date().toISOString()
          })
          .where(eq(userBalances.userId, withdrawal.userId));

        // 2. 更新提现记录
        await tx
          .update(withdrawals)
          .set({
            status: 'approved',
            reviewerId: reviewerId,
            reviewTime: new Date().toISOString(),
            reviewRemark: remark,
            updatedAt: new Date().toISOString()
          })
          .where(eq(withdrawals.id, withdrawalId));

        // 3. 更新累计提现
        await tx
          .update(userBalances)
          .set({
            totalWithdrawn: sql`${userBalances.totalWithdrawn} + ${actualAmount}`,
            updatedAt: new Date().toISOString()
          })
          .where(eq(userBalances.userId, withdrawal.userId));
      });

      return {
        success: true,
        message: '提现审核通过，待转账',
        amount,
        fee: Number(withdrawal.feeAmount) || 0,
        actualAmount
      };
    } else {
      // 审核拒绝，解冻余额
      await db.transaction(async (tx) => {
        // 1. 解冻余额
        await tx
          .update(userBalances)
          .set({
            availableBalance: sql`${userBalances.availableBalance} + ${amount}`,
            frozenBalance: sql`${userBalances.frozenBalance} - ${amount}`,
            updatedAt: new Date().toISOString()
          })
          .where(eq(userBalances.userId, withdrawal.userId));

        // 2. 更新提现记录
        await tx
          .update(withdrawals)
          .set({
            status: 'rejected',
            reviewerId: reviewerId,
            reviewTime: new Date().toISOString(),
            reviewRemark: remark,
            updatedAt: new Date().toISOString()
          })
          .where(eq(withdrawals.id, withdrawalId));
      });

      return {
        success: true,
        message: '提现审核已拒绝，余额已解冻'
      };
    }
  } catch (error: any) {
    console.error('审核提现失败:', error);
    return {
      success: false,
      message: error.message || '审核提现失败'
    };
  }
}
