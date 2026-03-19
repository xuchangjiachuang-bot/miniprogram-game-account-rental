import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createTransferBill } from '@/lib/wechat/v3';
import { balanceTransactions, db, userBalances, users, withdrawals } from './db';
import { safeLogFinanceAuditEvent } from './finance-audit-service';

const WITHDRAWAL_NAME_REQUIRED_THRESHOLD_FEN = 200000;

function isValidWithdrawalRecord(withdrawal: any) {
  return Number(withdrawal?.amount || 0) > 0 && Number(withdrawal?.actualAmount || 0) > 0;
}

export async function getWithdrawalRequests(params: {
  page: number;
  pageSize: number;
  status?: string;
}) {
  const { page, pageSize, status } = params;

  try {
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(withdrawals.status, status));
    }

    let baseQuery = db.select().from(withdrawals);
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions)) as any;
    }

    const allWithdrawals = ((await baseQuery.orderBy(desc(withdrawals.createdAt))) as any[]).filter(
      isValidWithdrawalRecord,
    );
    const userIds = Array.from(new Set(allWithdrawals.map((item) => item.userId).filter(Boolean)));

    const userList = userIds.length
      ? await db
          .select({
            id: users.id,
            phone: users.phone,
            nickname: users.nickname,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

    const userMap = new Map(userList.map((user) => [user.id, user]));
    const offset = (page - 1) * pageSize;
    const paginatedWithdrawals = allWithdrawals.slice(offset, offset + pageSize);

    const formattedWithdrawals = paginatedWithdrawals.map((withdrawal) => {
      const user = userMap.get(withdrawal.userId);
      const accountInfo =
        typeof withdrawal.accountInfo === 'string'
          ? JSON.parse(withdrawal.accountInfo || '{}')
          : ((withdrawal.accountInfo || {}) as Record<string, any>);

      return {
        id: withdrawal.id,
        withdrawalNo: withdrawal.withdrawalNo,
        userId: withdrawal.userId,
        userPhone: user?.phone || '',
        userNickname: user?.nickname || '',
        amount: Number(withdrawal.amount) || 0,
        fee: Number(withdrawal.feeAmount) || 0,
        actualAmount: Number(withdrawal.actualAmount) || 0,
        type: withdrawal.withdrawalType || 'wechat',
        accountNumber:
          accountInfo.accountNumber ||
          accountInfo.alipayAccount ||
          accountInfo.wechatAccount ||
          accountInfo.openid ||
          '',
        accountName: accountInfo.accountName || '',
        bankName: accountInfo.bankName || '',
        status: withdrawal.status,
        applyTime: withdrawal.createdAt,
        processTime: withdrawal.reviewTime,
        reviewComment: withdrawal.reviewRemark,
        remark: withdrawal.remark,
        thirdPartyTransactionId: withdrawal.thirdPartyTransactionId,
        failureReason: withdrawal.failureReason,
      };
    });

    return {
      success: true,
      data: formattedWithdrawals,
      total: allWithdrawals.length,
      page,
      pageSize,
    };
  } catch (error: any) {
    console.error('Failed to load withdrawal requests:', error);
    return {
      success: false,
      error: error.message || 'FAILED_TO_LOAD_WITHDRAWALS',
      data: [],
      total: 0,
      page,
      pageSize,
    };
  }
}

async function approveWithdrawalByWechatTransfer(params: {
  withdrawalId: string;
  reviewComment?: string;
  reviewerId: string;
}) {
  const { withdrawalId, reviewComment, reviewerId } = params;

  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .limit(1);

  if (rows.length === 0) {
    return {
      success: false,
      error: 'WITHDRAWAL_NOT_FOUND',
    };
  }

  const withdrawal = rows[0];
  if (withdrawal.status !== 'pending') {
    return {
      success: false,
      error: `WITHDRAWAL_STATUS_INVALID:${withdrawal.status}`,
    };
  }

  if (!isValidWithdrawalRecord(withdrawal)) {
    return {
      success: false,
      error: 'INVALID_WITHDRAWAL_AMOUNT',
    };
  }

  const accountInfo =
    typeof withdrawal.accountInfo === 'string'
      ? JSON.parse(withdrawal.accountInfo || '{}')
      : ((withdrawal.accountInfo || {}) as Record<string, any>);

  if (!accountInfo.openid) {
    return {
      success: false,
      error: 'WITHDRAWAL_OPENID_MISSING',
    };
  }

  const actualAmount = Number(withdrawal.actualAmount) || 0;
  const amount = Number(withdrawal.amount) || 0;
  const fee = Number(withdrawal.feeAmount) || 0;

  const transferResult = await createTransferBill({
    outBillNo: withdrawal.withdrawalNo,
    openid: accountInfo.openid,
    transferAmountFen: Math.round(actualAmount * 100),
    transferRemark: `Withdrawal ${withdrawal.withdrawalNo}`,
    // 微信官方转账接口仅在特定金额门槛及规则下要求收款人姓名。
    // 小额提现不强制携带 user_name，避免无谓地走公钥加密链路。
    userName:
      Math.round(actualAmount * 100) >= WITHDRAWAL_NAME_REQUIRED_THRESHOLD_FEN
        ? accountInfo.accountName || undefined
        : undefined,
  });

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(userBalances)
      .set({
        frozenBalance: sql`${userBalances.frozenBalance} - ${amount}`,
        totalWithdrawn: sql`${userBalances.totalWithdrawn} + ${actualAmount}`,
        updatedAt: now,
      })
      .where(eq(userBalances.userId, withdrawal.userId));

    await tx.insert(balanceTransactions).values({
      id: randomUUID(),
      userId: withdrawal.userId,
      withdrawalId: withdrawal.id,
      transactionType: 'withdraw',
      amount: amount.toFixed(2),
      balanceBefore: '0.00',
      balanceAfter: '0.00',
      description: `Withdrawal completed ${actualAmount.toFixed(2)}`,
      createdAt: now,
    });

    await safeLogFinanceAuditEvent({
      eventType: 'withdrawal_approved_transfer',
      status: 'success',
      userId: withdrawal.userId,
      withdrawalId: withdrawal.id,
      amount,
      balanceBefore: '0',
      balanceAfter: '0',
      details: {
        actualAmount,
        fee,
        reviewerId,
        reviewComment: reviewComment || 'Transfer initiated',
        transferBillNo: transferResult.transfer_bill_no || transferResult.out_bill_no,
        transferState: transferResult.state,
      },
    }, tx);

    await tx
      .update(withdrawals)
      .set({
        status: 'approved',
        reviewerId,
        reviewTime: now,
        reviewRemark: reviewComment || 'Transfer initiated',
        thirdPartyTransactionId: transferResult.transfer_bill_no || transferResult.out_bill_no,
        failureReason: null,
        updatedAt: now,
      })
      .where(eq(withdrawals.id, withdrawalId));
  });

  return {
    success: true,
    data: {
      amount,
      fee,
      actualAmount,
      thirdPartyTransactionId: transferResult.transfer_bill_no || transferResult.out_bill_no,
      transferState: transferResult.state,
    },
  };
}

export async function reviewWithdrawalRequest(params: {
  withdrawalId: string;
  status: 'approved' | 'rejected';
  reviewComment?: string;
  reviewerId: string;
}) {
  try {
    const { withdrawalId, status, reviewComment, reviewerId } = params;

    if (status === 'approved') {
      return await approveWithdrawalByWechatTransfer({
        withdrawalId,
        reviewComment,
        reviewerId,
      });
    }

    const { reviewWithdrawal } = await import('./user-balance-service');
    const result = await reviewWithdrawal(withdrawalId, false, reviewerId, reviewComment || '');

    if (!result.success) {
      return {
        success: false,
        error: result.message || 'WITHDRAWAL_REVIEW_FAILED',
      };
    }

    return {
      success: true,
      data: {
        amount: result.amount,
        fee: result.fee,
        actualAmount: result.actualAmount,
      },
    };
  } catch (error: any) {
    await safeLogFinanceAuditEvent({
      eventType: 'withdrawal_review_failed',
      status: 'failed',
      withdrawalId: params.withdrawalId,
      details: {
        reviewerId: params.reviewerId,
        status: params.status,
      },
      errorMessage: error.message || 'WITHDRAWAL_REVIEW_FAILED',
    });
    console.error('Failed to review withdrawal request:', error);
    return {
      success: false,
      error: error.message || 'WITHDRAWAL_REVIEW_FAILED',
    };
  }
}
