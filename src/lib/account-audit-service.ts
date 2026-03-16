/**
 * 账号审核服务
 * 管理账号的审核流程
 */

import { db, accounts, userBalances, balanceTransactions, accountDeposits, platformSettings, users } from './db';
import { eq, and } from 'drizzle-orm';

// ==================== 类型定义 ====================

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

// ==================== 账号审核核心功能 ====================

/**
 * 提交账号审核
 * 账号创建时自动提交审核
 *
 * 根据平台设置决定是否自动审核：
 * 1. 如果 requireManualReview = false，则自动通过审核
 * 2. 如果 autoApproveVerified = true 且用户已认证（isVerified = true），则自动通过审核
 * 3. 否则进入待审核状态
 *
 * @param accountId 账号ID
 * @returns 审核提交结果
 */
export async function submitForAudit(accountId: string): Promise<AuditResult> {
  try {
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (!accountList || accountList.length === 0) {
      return {
        success: false,
        message: '账号不存在'
      };
    }

    const account = accountList[0];

    // 获取平台设置
    const [settings] = await db.select().from(platformSettings).limit(1);

    const requireManualReview = settings?.requireManualReview ?? true;
    const autoApproveVerified = settings?.autoApproveVerified ?? false;

    // 获取卖家信息
    const sellerList = await db
      .select({
        id: users.id,
        isVerified: users.isVerified
      })
      .from(users)
      .where(eq(users.id, account.sellerId));
    const seller = sellerList[0];

    const isVerified = seller?.isVerified ?? false;

    console.log(`账号审核判断 - 账号ID: ${accountId}, 卖家ID: ${account.sellerId}`);
    console.log(`平台设置 - requireManualReview: ${requireManualReview}, autoApproveVerified: ${autoApproveVerified}`);
    console.log(`卖家信息 - isVerified: ${isVerified}`);

    // 判断是否需要自动审核
    let shouldAutoApprove = false;

    // 如果关闭人工审核，则自动通过
    if (!requireManualReview) {
      shouldAutoApprove = true;
      console.log('自动审核通过：人工审核已关闭');
    }
    // 如果开启已认证用户自动审核且用户已认证，则自动通过
    else if (autoApproveVerified && isVerified) {
      shouldAutoApprove = true;
      console.log('自动审核通过：已认证用户自动审核开启');
    }

    if (shouldAutoApprove) {
      // 自动审核通过
      await db.transaction(async (tx) => {
        // 更新账号审核状态为已通过
        await tx
          .update(accounts)
          .set({
            auditStatus: 'approved',
            status: 'available', // 设置为可用状态
            auditUserId: null, // 系统自动审核，无需指定审核人
            auditTime: new Date().toISOString(),
            listedAt: new Date().toISOString(), // 设置上架时间
            updatedAt: new Date().toISOString()
          })
          .where(eq(accounts.id, accountId));

        // 如果有保证金记录，更新状态为已释放（账号已上架）
        if (account.depositId) {
          // 上架保证金应在账号上架期间保持冻结，避免保证金记录与钱包冻结余额不一致。
        }
      });

      console.log(`账号 ${accountId} 已自动审核通过`);

      // 重新查询账号数据
      const [updatedAccount] = await db.select().from(accounts).where(eq(accounts.id, accountId));

      return {
        success: true,
        message: '账号已自动审核通过，已上架',
        account: updatedAccount
      };
    } else {
      // 进入待审核状态
      await db
        .update(accounts)
        .set({
          auditStatus: 'pending',
          status: 'draft', // 设置为草稿状态，不在前台显示
          updatedAt: new Date().toISOString()
        })
        .where(eq(accounts.id, accountId));

      console.log(`账号 ${accountId} 已提交审核，等待管理员审核`);

      return {
        success: true,
        message: '账号已提交审核，请等待管理员审核',
        account: { ...account, auditStatus: 'pending', status: 'draft' }
      };
    }
  } catch (error: any) {
    console.error('提交审核失败:', error);
    return {
      success: false,
      message: error.message || '提交审核失败'
    };
  }
}

/**
 * 审核通过账号
 *
 * @param accountId 账号ID
 * @param auditUserId 审核人ID
 * @returns 审核结果
 */
export async function approveAccount(
  accountId: string,
  auditUserId: string
): Promise<AuditResult> {
  try {
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (!accountList || accountList.length === 0) {
      return {
        success: false,
        message: '账号不存在'
      };
    }

    const account = accountList[0];

    if (account.auditStatus === 'approved') {
      return {
        success: false,
        message: '账号已通过审核'
      };
    }

    if (account.auditStatus === 'rejected') {
      return {
        success: false,
        message: '账号已被拒绝，需要重新提交审核'
      };
    }

    // 开始事务
    await db.transaction(async (tx) => {
      // 1. 更新账号审核状态
      await tx
        .update(accounts)
        .set({
          auditStatus: 'approved',
          status: 'available', // 设置为可用状态
          auditUserId: auditUserId,
          auditTime: new Date().toISOString(),
          listedAt: new Date().toISOString(), // 设置上架时间
          updatedAt: new Date().toISOString()
        })
        .where(eq(accounts.id, accountId));

      // 2. 如果有保证金记录，更新状态为已释放（账号已上架）
      if (account.depositId) {
        // 上架保证金应在账号上架期间保持冻结，避免保证金记录与钱包冻结余额不一致。
      }
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
        listedAt: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error('审核通过失败:', error);
    return {
      success: false,
      message: error.message || '审核通过失败'
    };
  }
}

/**
 * 拒绝账号
 *
 * @param accountId 账号ID
 * @param auditUserId 审核人ID
 * @param reason 拒绝原因
 * @returns 审核结果
 */
export async function rejectAccount(
  accountId: string,
  auditUserId: string,
  reason: string
): Promise<AuditResult> {
  try {
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (!accountList || accountList.length === 0) {
      return {
        success: false,
        message: '账号不存在'
      };
    }

    const account = accountList[0];

    if (account.auditStatus === 'approved') {
      return {
        success: false,
        message: '账号已通过审核，不能拒绝'
      };
    }

    if (account.auditStatus === 'rejected') {
      return {
        success: false,
        message: '账号已被拒绝'
      };
    }

    // 开始事务
    await db.transaction(async (tx) => {
      // 1. 更新账号审核状态
      await tx
        .update(accounts)
        .set({
          auditStatus: 'rejected',
          status: 'rejected', // 设置为拒绝状态
          auditUserId: auditUserId,
          auditReason: reason,
          auditTime: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(accounts.id, accountId));

      // 2. 如果有保证金记录，退还保证金
      if (account.depositId) {
        const depositList = await tx
          .select()
          .from(accountDeposits)
          .where(eq(accountDeposits.id, account.depositId));

        if (depositList.length > 0) {
          const deposit = depositList[0];

          // 更新保证金记录状态
          await tx
            .update(accountDeposits)
            .set({
              status: 'released',
              refundReason: 'rejected',
              refundedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            .where(eq(accountDeposits.id, account.depositId));

          // 解冻用户保证金
          const userBalancesList = await tx
            .select()
            .from(userBalances)
            .where(eq(userBalances.userId, account.sellerId));

          if (userBalancesList.length > 0) {
            const oldFrozen = Number(userBalancesList[0].frozenBalance) || 0;
            const oldAvailable = Number(userBalancesList[0].availableBalance) || 0;
            const depositAmount = Number(deposit.amount) || 0;
            const newFrozen = oldFrozen - depositAmount;
            const newAvailable = oldAvailable + depositAmount;

            await tx
              .update(userBalances)
              .set({
                frozenBalance: newFrozen.toString(),
                availableBalance: newAvailable.toString(),
                updatedAt: new Date().toISOString()
              })
              .where(eq(userBalances.userId, account.sellerId));

            // 记录余额变动
            await tx.insert(balanceTransactions).values({
              id: crypto.randomUUID(),
              userId: account.sellerId,
              transactionType: 'deposit_refund',
              amount: depositAmount.toString(),
              balanceBefore: oldAvailable.toString(),
              balanceAfter: newAvailable.toString(),
              description: `账号审核拒绝，保证金退还`,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    });

    return {
      success: true,
      message: '账号审核已拒绝，保证金已退还',
      account: {
        ...account,
        auditStatus: 'rejected',
        status: 'rejected',
        auditUserId,
        auditReason: reason,
        auditTime: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error('拒绝账号失败:', error);
    return {
      success: false,
      message: error.message || '拒绝账号失败'
    };
  }
}

/**
 * 获取待审核账号列表
 *
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 待审核账号列表
 */
export async function getPendingAuditAccounts(page: number = 1, pageSize: number = 20) {
  try {
    const offset = (page - 1) * pageSize;

    const pendingAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.auditStatus, 'pending'))
      .limit(pageSize)
      .offset(offset);

    // 获取总数
    const totalResult = await db
      .select({ count: accounts.id })
      .from(accounts)
      .where(eq(accounts.auditStatus, 'pending'));

    const total = totalResult.length;

    return {
      success: true,
      data: {
        total,
        accounts: pendingAccounts,
        page,
        pageSize
      }
    };
  } catch (error: any) {
    console.error('获取待审核账号列表失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取账号审核状态
 *
 * @param accountId 账号ID
 * @returns 审核状态
 */
export async function getAccountAuditStatus(accountId: string) {
  try {
    const accountList = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (!accountList || accountList.length === 0) {
      return {
        success: false,
        error: '账号不存在'
      };
    }

    const account = accountList[0];

    return {
      success: true,
      data: {
        auditStatus: account.auditStatus,
        auditReason: account.auditReason,
        auditUserId: account.auditUserId,
        auditTime: account.auditTime
      }
    };
  } catch (error: any) {
    console.error('获取审核状态失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 批量审核账号
 *
 * @param accountIds 账号ID数组
 * @param auditUserId 审核人ID
 * @param action 审核操作（approve或reject）
 * @param reason 拒绝原因（仅reject时需要）
 * @returns 审核结果
 */
export async function batchAuditAccounts(
  accountIds: string[],
  auditUserId: string,
  action: 'approve' | 'reject',
  reason?: string
) {
  try {
    const results = [];

    for (const accountId of accountIds) {
      if (action === 'approve') {
        const result = await approveAccount(accountId, auditUserId);
        results.push({ accountId, ...result });
      } else {
        if (!reason) {
          results.push({
            accountId,
            success: false,
            message: '拒绝原因不能为空'
          });
          continue;
        }
        const result = await rejectAccount(accountId, auditUserId, reason);
        results.push({ accountId, ...result });
      }
    }

    const successCount = results.filter((r: any) => r.success).length;
    const failedCount = results.filter((r: any) => !r.success).length;

    return {
      success: true,
      message: `批量审核完成，成功 ${successCount} 个，失败 ${failedCount} 个`,
      data: results
    };
  } catch (error: any) {
    console.error('批量审核失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
