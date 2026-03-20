import { eq } from 'drizzle-orm';
import {
  accounts,
  accountDeposits,
  balanceTransactions,
  db,
  platformSettings,
  userBalances,
} from './db';

export type AuditStatus = 'pending' | 'approved' | 'rejected';

export interface AuditResult {
  success: boolean;
  message: string;
  account?: any;
}

export interface PendingAuditList {
  total: number;
  accounts: any[];
}

export async function submitForAudit(accountId: string): Promise<AuditResult> {
  try {
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (accountList.length === 0) {
      return {
        success: false,
        message: '账号不存在',
      };
    }

    const account = accountList[0];
    const [settings] = await db.select().from(platformSettings).limit(1);
    const requireManualReview = settings?.requireManualReview ?? true;

    console.log(`账号审核判断 - accountId: ${accountId}, sellerId: ${account.sellerId}`);
    console.log(`平台设置 - requireManualReview: ${requireManualReview}`);

    if (!requireManualReview) {
      await db.transaction(async (tx) => {
        await tx
          .update(accounts)
          .set({
            auditStatus: 'approved',
            status: 'available',
            auditUserId: null,
            auditTime: new Date().toISOString(),
            listedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(accounts.id, accountId));
      });

      const [updatedAccount] = await db.select().from(accounts).where(eq(accounts.id, accountId));

      return {
        success: true,
        message: '账号已自动审核通过，已上架',
        account: updatedAccount,
      };
    }

    await db
      .update(accounts)
      .set({
        auditStatus: 'pending',
        status: 'draft',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(accounts.id, accountId));

    return {
      success: true,
      message: '账号已提交审核，请等待管理员审核',
      account: { ...account, auditStatus: 'pending', status: 'draft' },
    };
  } catch (error: any) {
    console.error('提交审核失败:', error);
    return {
      success: false,
      message: error.message || '提交审核失败',
    };
  }
}

export async function approveAccount(accountId: string, auditUserId: string): Promise<AuditResult> {
  try {
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (accountList.length === 0) {
      return {
        success: false,
        message: '账号不存在',
      };
    }

    const account = accountList[0];

    if (account.auditStatus === 'approved') {
      return {
        success: false,
        message: '账号已通过审核',
      };
    }

    if (account.auditStatus === 'rejected') {
      return {
        success: false,
        message: '账号已被拒绝，需要重新提交审核',
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(accounts)
        .set({
          auditStatus: 'approved',
          status: 'available',
          auditUserId,
          auditTime: new Date().toISOString(),
          listedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, accountId));
    });

    return {
      success: true,
      message: '账号审核通过，已上架',
      account: {
        ...account,
        auditStatus: 'approved',
        status: 'available',
        auditUserId,
        auditTime: new Date().toISOString(),
        listedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('审核通过失败:', error);
    return {
      success: false,
      message: error.message || '审核通过失败',
    };
  }
}

export async function rejectAccount(
  accountId: string,
  auditUserId: string,
  reason: string,
): Promise<AuditResult> {
  try {
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (accountList.length === 0) {
      return {
        success: false,
        message: '账号不存在',
      };
    }

    const account = accountList[0];

    if (account.auditStatus === 'approved') {
      return {
        success: false,
        message: '账号已通过审核，不能拒绝',
      };
    }

    if (account.auditStatus === 'rejected') {
      return {
        success: false,
        message: '账号已被拒绝',
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(accounts)
        .set({
          auditStatus: 'rejected',
          status: 'rejected',
          auditUserId,
          auditReason: reason,
          auditTime: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, accountId));

      if (!account.depositId) {
        return;
      }

      const depositList = await tx
        .select()
        .from(accountDeposits)
        .where(eq(accountDeposits.id, account.depositId));

      if (depositList.length === 0) {
        return;
      }

      const deposit = depositList[0];

      await tx
        .update(accountDeposits)
        .set({
          status: 'released',
          refundReason: 'rejected',
          refundedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accountDeposits.id, account.depositId));

      const userBalanceList = await tx
        .select()
        .from(userBalances)
        .where(eq(userBalances.userId, account.sellerId));

      if (userBalanceList.length === 0) {
        return;
      }

      const currentBalance = userBalanceList[0];
      const oldFrozen = Number(currentBalance.frozenBalance) || 0;
      const oldAvailable = Number(currentBalance.availableBalance) || 0;
      const depositAmount = Number(deposit.amount) || 0;
      const newFrozen = oldFrozen - depositAmount;
      const newAvailable = oldAvailable + depositAmount;

      await tx
        .update(userBalances)
        .set({
          frozenBalance: newFrozen.toString(),
          availableBalance: newAvailable.toString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userBalances.userId, account.sellerId));

      await tx.insert(balanceTransactions).values({
        id: crypto.randomUUID(),
        userId: account.sellerId,
        transactionType: 'deposit_refund',
        amount: depositAmount.toString(),
        balanceBefore: oldAvailable.toString(),
        balanceAfter: newAvailable.toString(),
        description: '账号审核拒绝，保证金退回',
        createdAt: new Date().toISOString(),
      });
    });

    return {
      success: true,
      message: '账号审核已拒绝，保证金已退回',
      account: {
        ...account,
        auditStatus: 'rejected',
        status: 'rejected',
        auditUserId,
        auditReason: reason,
        auditTime: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('拒绝账号失败:', error);
    return {
      success: false,
      message: error.message || '拒绝账号失败',
    };
  }
}

export async function getPendingAuditAccounts(page = 1, pageSize = 20) {
  try {
    const offset = (page - 1) * pageSize;

    const pendingAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.auditStatus, 'pending'))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db
      .select({ count: accounts.id })
      .from(accounts)
      .where(eq(accounts.auditStatus, 'pending'));

    return {
      success: true,
      data: {
        total: totalResult.length,
        accounts: pendingAccounts,
        page,
        pageSize,
      },
    };
  } catch (error: any) {
    console.error('获取待审核账号列表失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getAccountAuditStatus(accountId: string) {
  try {
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (accountList.length === 0) {
      return {
        success: false,
        error: '账号不存在',
      };
    }

    const account = accountList[0];

    return {
      success: true,
      data: {
        auditStatus: account.auditStatus,
        auditReason: account.auditReason,
        auditUserId: account.auditUserId,
        auditTime: account.auditTime,
      },
    };
  } catch (error: any) {
    console.error('获取审核状态失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function batchAuditAccounts(
  accountIds: string[],
  auditUserId: string,
  action: 'approve' | 'reject',
  reason?: string,
) {
  try {
    const results = [];

    for (const accountId of accountIds) {
      if (action === 'approve') {
        const result = await approveAccount(accountId, auditUserId);
        results.push({ accountId, ...result });
        continue;
      }

      if (!reason) {
        results.push({
          accountId,
          success: false,
          message: '拒绝原因不能为空',
        });
        continue;
      }

      const result = await rejectAccount(accountId, auditUserId, reason);
      results.push({ accountId, ...result });
    }

    const successCount = results.filter((item: any) => item.success).length;
    const failedCount = results.filter((item: any) => !item.success).length;

    return {
      success: true,
      message: `批量审核完成，成功 ${successCount} 个，失败 ${failedCount} 个`,
      data: results,
    };
  } catch (error: any) {
    console.error('批量审核失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
