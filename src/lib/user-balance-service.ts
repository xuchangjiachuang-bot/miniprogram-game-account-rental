import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import {
  balanceTransactions,
  db,
  platformSettings,
  userBalances,
  withdrawals,
} from './db';

export interface UserBalance {
  userId: string;
  availableBalance: number;
  frozenBalance: number;
  totalWithdrawn: number;
  totalEarned: number;
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

function toNumber(value: unknown) {
  return Number(value || 0);
}

function toUserBalance(record: typeof userBalances.$inferSelect): UserBalance {
  return {
    userId: record.userId,
    availableBalance: toNumber(record.availableBalance),
    frozenBalance: toNumber(record.frozenBalance),
    totalWithdrawn: toNumber(record.totalWithdrawn),
    totalEarned: toNumber(record.totalEarned),
  };
}

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

async function insertBalanceTransaction(params: {
  userId: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  withdrawalId?: string;
}) {
  await db.insert(balanceTransactions).values({
    id: randomUUID(),
    userId: params.userId,
    withdrawalId: params.withdrawalId || null,
    transactionType: params.transactionType,
    amount: params.amount.toFixed(2),
    balanceBefore: params.balanceBefore.toFixed(2),
    balanceAfter: params.balanceAfter.toFixed(2),
    description: params.description,
    createdAt: new Date().toISOString(),
  });
}

export async function getUserBalance(userId: string): Promise<UserBalance | null> {
  try {
    const rows = await db.select().from(userBalances).where(eq(userBalances.userId, userId)).limit(1);
    const row = rows[0];
    return row ? toUserBalance(row) : null;
  } catch (error) {
    console.error('[user-balance] getUserBalance failed:', error);
    return null;
  }
}

export async function ensureUserBalance(userId: string): Promise<UserBalance> {
  const existing = await getUserBalance(userId);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();

  try {
    await db.insert(userBalances).values({
      id: randomUUID(),
      userId,
      availableBalance: '0',
      frozenBalance: '0',
      totalWithdrawn: '0',
      totalEarned: '0',
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      console.error('[user-balance] ensureUserBalance failed:', error);
      throw error;
    }
  }

  const initialized = await getUserBalance(userId);
  if (!initialized) {
    throw new Error('USER_BALANCE_INIT_FAILED');
  }

  return initialized;
}

export async function addAvailableBalance(
  userId: string,
  amount: number,
  description = 'Balance adjusted',
): Promise<BalanceUpdateResult> {
  try {
    const balance = await ensureUserBalance(userId);
    const oldBalance = balance.availableBalance;
    const newBalance = oldBalance + amount;
    const newTotalEarned = balance.totalEarned + amount;

    await db
      .update(userBalances)
      .set({
        availableBalance: newBalance.toFixed(2),
        totalEarned: newTotalEarned.toFixed(2),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userBalances.userId, userId));

    await insertBalanceTransaction({
      userId,
      transactionType: 'income',
      amount,
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      description,
    });

    return {
      success: true,
      message: 'BALANCE_UPDATED',
      oldBalance,
      newBalance,
    };
  } catch (error: any) {
    console.error('[user-balance] addAvailableBalance failed:', error);
    return {
      success: false,
      message: error?.message || 'BALANCE_UPDATE_FAILED',
      oldBalance: 0,
      newBalance: 0,
    };
  }
}

export async function freezeBalance(
  userId: string,
  amount: number,
  description = 'Withdrawal requested',
): Promise<BalanceUpdateResult> {
  try {
    const balance = await ensureUserBalance(userId);
    if (balance.availableBalance < amount) {
      return {
        success: false,
        message: 'INSUFFICIENT_AVAILABLE_BALANCE',
        oldBalance: balance.availableBalance,
        newBalance: balance.availableBalance,
      };
    }

    const oldBalance = balance.availableBalance;
    const newBalance = oldBalance - amount;
    const newFrozenBalance = balance.frozenBalance + amount;

    await db
      .update(userBalances)
      .set({
        availableBalance: newBalance.toFixed(2),
        frozenBalance: newFrozenBalance.toFixed(2),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userBalances.userId, userId));

    await insertBalanceTransaction({
      userId,
      transactionType: 'freeze',
      amount,
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      description,
    });

    return {
      success: true,
      message: 'BALANCE_FROZEN',
      oldBalance,
      newBalance,
    };
  } catch (error: any) {
    console.error('[user-balance] freezeBalance failed:', error);
    return {
      success: false,
      message: error?.message || 'BALANCE_FREEZE_FAILED',
      oldBalance: 0,
      newBalance: 0,
    };
  }
}

export async function unfreezeBalance(
  userId: string,
  amount: number,
  description = 'Balance released',
): Promise<BalanceUpdateResult> {
  try {
    const balance = await ensureUserBalance(userId);
    if (balance.frozenBalance < amount) {
      return {
        success: false,
        message: 'INSUFFICIENT_FROZEN_BALANCE',
        oldBalance: balance.availableBalance,
        newBalance: balance.availableBalance,
      };
    }

    const oldBalance = balance.availableBalance;
    const newBalance = oldBalance + amount;
    const newFrozenBalance = balance.frozenBalance - amount;

    await db
      .update(userBalances)
      .set({
        availableBalance: newBalance.toFixed(2),
        frozenBalance: newFrozenBalance.toFixed(2),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userBalances.userId, userId));

    await insertBalanceTransaction({
      userId,
      transactionType: 'unfreeze',
      amount,
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      description,
    });

    return {
      success: true,
      message: 'BALANCE_UNFROZEN',
      oldBalance,
      newBalance,
    };
  } catch (error: any) {
    console.error('[user-balance] unfreezeBalance failed:', error);
    return {
      success: false,
      message: error?.message || 'BALANCE_UNFREEZE_FAILED',
      oldBalance: 0,
      newBalance: 0,
    };
  }
}

export async function requestWithdrawal(
  userId: string,
  amount: number,
  accountInfo: Record<string, unknown>,
): Promise<WithdrawalResult> {
  try {
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        message: 'INVALID_WITHDRAWAL_AMOUNT',
      };
    }

    const settingsRows = await db.select().from(platformSettings).limit(1);
    const settings = settingsRows[0];
    const feeRate = toNumber(settings?.withdrawalFee) || 1;
    const fee = feeRate > 0 ? Math.max(amount * (feeRate / 100), 1) : 0;
    const actualAmount = Number((amount - fee).toFixed(2));

    if (actualAmount <= 0) {
      return {
        success: false,
        message: 'WITHDRAWAL_AMOUNT_TOO_SMALL',
      };
    }

    const balance = await ensureUserBalance(userId);
    if (balance.availableBalance < amount) {
      return {
        success: false,
        message: 'INSUFFICIENT_AVAILABLE_BALANCE',
      };
    }

    const withdrawalId = randomUUID();
    const withdrawalNo = `WD${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
    const reviewRequired = settings?.requireManualReview !== false;
    const username =
      String(accountInfo.accountName || accountInfo.nickname || accountInfo.phone || userId).slice(0, 100);

    await db.transaction(async (tx) => {
      await tx
        .update(userBalances)
        .set({
          availableBalance: (balance.availableBalance - amount).toFixed(2),
          frozenBalance: (balance.frozenBalance + amount).toFixed(2),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userBalances.userId, userId));

      await tx.insert(balanceTransactions).values({
        id: randomUUID(),
        userId,
        withdrawalId,
        transactionType: 'freeze',
        amount: amount.toFixed(2),
        balanceBefore: balance.availableBalance.toFixed(2),
        balanceAfter: (balance.availableBalance - amount).toFixed(2),
        description: 'Withdrawal requested',
        createdAt: new Date().toISOString(),
      });

      await tx.insert(withdrawals).values({
        id: withdrawalId,
        withdrawalNo,
        userId,
        username,
        amount: amount.toFixed(2),
        withdrawalFee: feeRate.toFixed(2),
        feeAmount: fee.toFixed(2),
        actualAmount: actualAmount.toFixed(2),
        withdrawalType: 'wechat',
        accountInfo,
        status: reviewRequired ? 'pending' : 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    return {
      success: true,
      message: reviewRequired ? 'WITHDRAWAL_CREATED' : 'WITHDRAWAL_APPROVED',
      withdrawalId,
      amount,
      fee,
      actualAmount,
    };
  } catch (error: any) {
    console.error('[user-balance] requestWithdrawal failed:', error);
    return {
      success: false,
      message: error?.message || 'WITHDRAWAL_REQUEST_FAILED',
    };
  }
}

export async function reviewWithdrawal(
  withdrawalId: string,
  approved: boolean,
  reviewerId: string,
  remark = '',
): Promise<WithdrawalResult> {
  try {
    const withdrawalRows = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);
    const withdrawal = withdrawalRows[0];

    if (!withdrawal) {
      return {
        success: false,
        message: 'WITHDRAWAL_NOT_FOUND',
      };
    }

    if (withdrawal.status !== 'pending') {
      return {
        success: false,
        message: 'WITHDRAWAL_ALREADY_REVIEWED',
      };
    }

    const amount = toNumber(withdrawal.amount);
    const fee = toNumber(withdrawal.feeAmount);
    const actualAmount = toNumber(withdrawal.actualAmount);
    const balance = await ensureUserBalance(withdrawal.userId);

    await db.transaction(async (tx) => {
      if (approved) {
        await tx
          .update(userBalances)
          .set({
            frozenBalance: sql`${userBalances.frozenBalance} - ${amount}`,
            totalWithdrawn: sql`${userBalances.totalWithdrawn} + ${actualAmount}`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userBalances.userId, withdrawal.userId));

        await tx.insert(balanceTransactions).values({
          id: randomUUID(),
          userId: withdrawal.userId,
          withdrawalId: withdrawal.id,
          transactionType: 'withdrawal',
          amount: amount.toFixed(2),
          balanceBefore: balance.availableBalance.toFixed(2),
          balanceAfter: balance.availableBalance.toFixed(2),
          description: remark || 'Withdrawal approved',
          createdAt: new Date().toISOString(),
        });

        await tx
          .update(withdrawals)
          .set({
            status: 'approved',
            reviewerId,
            reviewTime: new Date().toISOString(),
            reviewRemark: remark,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(withdrawals.id, withdrawalId));

        return;
      }

      await tx
        .update(userBalances)
        .set({
          availableBalance: sql`${userBalances.availableBalance} + ${amount}`,
          frozenBalance: sql`${userBalances.frozenBalance} - ${amount}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userBalances.userId, withdrawal.userId));

      await tx.insert(balanceTransactions).values({
        id: randomUUID(),
        userId: withdrawal.userId,
        withdrawalId: withdrawal.id,
        transactionType: 'unfreeze',
        amount: amount.toFixed(2),
        balanceBefore: balance.availableBalance.toFixed(2),
        balanceAfter: (balance.availableBalance + amount).toFixed(2),
        description: remark || 'Withdrawal rejected',
        createdAt: new Date().toISOString(),
      });

      await tx
        .update(withdrawals)
        .set({
          status: 'rejected',
          reviewerId,
          reviewTime: new Date().toISOString(),
          reviewRemark: remark,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(withdrawals.id, withdrawalId));
    });

    return {
      success: true,
      message: approved ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
      amount,
      fee,
      actualAmount,
    };
  } catch (error: any) {
    console.error('[user-balance] reviewWithdrawal failed:', error);
    return {
      success: false,
      message: error?.message || 'WITHDRAWAL_REVIEW_FAILED',
    };
  }
}
