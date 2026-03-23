import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { balanceTransactions, db, userBalances, users, withdrawals } from './db';
import { safeLogFinanceAuditEvent } from './finance-audit-service';
import { lockWithdrawalFinanceScope } from './finance-lock-service';
import { createTransferBill, queryTransferBill } from './wechat/v3';

const WITHDRAWAL_NAME_REQUIRED_THRESHOLD_FEN = 200000;
const WITHDRAWAL_RECONCILE_STATUSES = ['pending', 'processing', 'approved'] as const;

type WithdrawalRow = typeof withdrawals.$inferSelect;

interface TransferBillSnapshot {
  out_bill_no?: string;
  transfer_bill_no?: string;
  state?: string;
  fail_reason?: string;
  update_time?: string;
  create_time?: string;
  package_info?: string;
}

interface ApplyTransferStateOptions {
  reviewerId?: string;
  reviewComment?: string;
  source: 'approval' | 'callback' | 'reconcile';
}

function isValidWithdrawalRecord(withdrawal: any) {
  return Number(withdrawal?.amount || 0) > 0 && Number(withdrawal?.actualAmount || 0) > 0;
}

function toAmount(value: unknown) {
  return Number(value || 0);
}

function parseAccountInfo(withdrawal: Pick<WithdrawalRow, 'accountInfo'>) {
  if (typeof withdrawal.accountInfo === 'string') {
    try {
      return JSON.parse(withdrawal.accountInfo || '{}') as Record<string, any>;
    } catch {
      return {};
    }
  }

  return (withdrawal.accountInfo || {}) as Record<string, any>;
}

function normalizeTransferState(state?: string | null) {
  return String(state || '').trim().toUpperCase();
}

function mapTransferState(state?: string | null) {
  const normalizedState = normalizeTransferState(state);

  if (normalizedState === 'SUCCESS') {
    return {
      internalStatus: 'approved' as const,
      reviewRemark: '微信提现已到账',
      failureReason: null as string | null,
    };
  }

  if (['FAIL', 'FAILED', 'CANCELLED', 'CLOSED'].includes(normalizedState)) {
    return {
      internalStatus: 'failed' as const,
      reviewRemark: '微信提现失败',
      failureReason: '微信提现失败',
    };
  }

  if (normalizedState === 'WAIT_USER_CONFIRM') {
    return {
      internalStatus: 'processing' as const,
      reviewRemark: '待微信零钱确认收款',
      failureReason: null as string | null,
    };
  }

  if (normalizedState) {
    return {
      internalStatus: 'processing' as const,
      reviewRemark: '微信提现处理中',
      failureReason: null as string | null,
    };
  }

  return {
    internalStatus: 'processing' as const,
    reviewRemark: '微信提现处理中',
    failureReason: null as string | null,
  };
}

async function getWithdrawalById(withdrawalId: string) {
  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .limit(1);

  return rows[0] || null;
}

async function getWithdrawalByNo(withdrawalNo: string) {
  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.withdrawalNo, withdrawalNo))
    .limit(1);

  return rows[0] || null;
}

async function getUserBalanceRecord(tx: any, userId: string) {
  const rows = await tx
    .select()
    .from(userBalances)
    .where(eq(userBalances.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    throw new Error('USER_BALANCE_NOT_FOUND');
  }

  return rows[0];
}

async function hasFinalizedWithdrawalAccounting(tx: any, withdrawal: WithdrawalRow) {
  const accountInfo = parseAccountInfo(withdrawal);
  if (typeof accountInfo.withdrawalAccountingFinalized === 'boolean') {
    return accountInfo.withdrawalAccountingFinalized;
  }

  return hasWithdrawalSettlementTransactionRecord(tx, withdrawal.id);
}

async function hasWithdrawalSettlementTransactionRecord(tx: any, withdrawalId: string) {
  const rows = await tx
    .select({ id: balanceTransactions.id })
    .from(balanceTransactions)
    .where(and(
      eq(balanceTransactions.withdrawalId, withdrawalId),
      inArray(balanceTransactions.transactionType, ['withdraw', 'withdrawal']),
    ))
    .limit(1);

  return rows.length > 0;
}

function buildTransferAccountInfo(
  withdrawal: WithdrawalRow,
  transferSnapshot: TransferBillSnapshot,
  nextStatus: string,
  failReason?: string | null,
  accountingFinalized?: boolean,
) {
  const current = parseAccountInfo(withdrawal);

  return {
    ...current,
    transferState: normalizeTransferState(transferSnapshot.state),
    transferBillNo: transferSnapshot.transfer_bill_no || current.transferBillNo || null,
    transferPackageInfo: transferSnapshot.package_info || current.transferPackageInfo || null,
    transferFailReason: failReason || transferSnapshot.fail_reason || null,
    transferUpdatedAt: transferSnapshot.update_time || new Date().toISOString(),
    withdrawalStatus: nextStatus,
    withdrawalAccountingFinalized: accountingFinalized ?? current.withdrawalAccountingFinalized ?? false,
  };
}

async function finalizeWithdrawalAccounting(tx: any, withdrawal: WithdrawalRow, now: string) {
  const amount = toAmount(withdrawal.amount);
  const actualAmount = toAmount(withdrawal.actualAmount);
  const balance = await getUserBalanceRecord(tx, withdrawal.userId);
  const availableBalance = toAmount(balance.availableBalance);

  await tx
    .update(userBalances)
    .set({
      frozenBalance: sql`${userBalances.frozenBalance} - ${amount}`,
      totalWithdrawn: sql`${userBalances.totalWithdrawn} + ${actualAmount}`,
      updatedAt: now,
    })
    .where(eq(userBalances.userId, withdrawal.userId));

  if (!(await hasWithdrawalSettlementTransactionRecord(tx, withdrawal.id))) {
    await tx.insert(balanceTransactions).values({
      id: randomUUID(),
      userId: withdrawal.userId,
      withdrawalId: withdrawal.id,
      transactionType: 'withdraw',
      amount: amount.toFixed(2),
      balanceBefore: availableBalance.toFixed(2),
      balanceAfter: availableBalance.toFixed(2),
      description: `Withdrawal completed ${actualAmount.toFixed(2)}`,
      createdAt: now,
    });
  }

  await safeLogFinanceAuditEvent({
    eventType: 'withdrawal_transfer_succeeded',
    status: 'success',
    userId: withdrawal.userId,
    withdrawalId: withdrawal.id,
    amount,
    balanceBefore: availableBalance,
    balanceAfter: availableBalance,
    details: {
      actualAmount,
      withdrawalNo: withdrawal.withdrawalNo,
    },
  }, tx);
}

async function moveFinalizedWithdrawalBackToProcessing(tx: any, withdrawal: WithdrawalRow, now: string) {
  const amount = toAmount(withdrawal.amount);
  const actualAmount = toAmount(withdrawal.actualAmount);
  const balance = await getUserBalanceRecord(tx, withdrawal.userId);
  const availableBalance = toAmount(balance.availableBalance);

  await tx
    .update(userBalances)
    .set({
      frozenBalance: sql`${userBalances.frozenBalance} + ${amount}`,
      totalWithdrawn: sql`${userBalances.totalWithdrawn} - ${actualAmount}`,
      updatedAt: now,
    })
    .where(eq(userBalances.userId, withdrawal.userId));

  await safeLogFinanceAuditEvent({
    eventType: 'withdrawal_transfer_reopened',
    status: 'pending',
    userId: withdrawal.userId,
    withdrawalId: withdrawal.id,
    amount,
    balanceBefore: availableBalance,
    balanceAfter: availableBalance,
    details: {
      actualAmount,
      withdrawalNo: withdrawal.withdrawalNo,
    },
  }, tx);
}

async function failWithdrawalAccounting(tx: any, withdrawal: WithdrawalRow, now: string, finalized: boolean) {
  const amount = toAmount(withdrawal.amount);
  const actualAmount = toAmount(withdrawal.actualAmount);
  const balance = await getUserBalanceRecord(tx, withdrawal.userId);
  const availableBalance = toAmount(balance.availableBalance);
  const nextAvailableBalance = availableBalance + amount;

  if (finalized) {
    await tx
      .update(userBalances)
      .set({
        availableBalance: sql`${userBalances.availableBalance} + ${amount}`,
        totalWithdrawn: sql`${userBalances.totalWithdrawn} - ${actualAmount}`,
        updatedAt: now,
      })
      .where(eq(userBalances.userId, withdrawal.userId));
  } else {
    await tx
      .update(userBalances)
      .set({
        availableBalance: sql`${userBalances.availableBalance} + ${amount}`,
        frozenBalance: sql`${userBalances.frozenBalance} - ${amount}`,
        updatedAt: now,
      })
      .where(eq(userBalances.userId, withdrawal.userId));
  }

  await tx.insert(balanceTransactions).values({
    id: randomUUID(),
    userId: withdrawal.userId,
    withdrawalId: withdrawal.id,
    transactionType: 'unfreeze',
    amount: amount.toFixed(2),
    balanceBefore: availableBalance.toFixed(2),
    balanceAfter: nextAvailableBalance.toFixed(2),
    description: 'Withdrawal failed and balance returned',
    createdAt: now,
  });

  await safeLogFinanceAuditEvent({
    eventType: 'withdrawal_transfer_failed',
    status: 'failed',
    userId: withdrawal.userId,
    withdrawalId: withdrawal.id,
    amount,
    balanceBefore: availableBalance,
    balanceAfter: nextAvailableBalance,
    details: {
      actualAmount,
      finalized,
      withdrawalNo: withdrawal.withdrawalNo,
    },
  }, tx);
}

async function applyTransferStateToWithdrawal(
  withdrawal: WithdrawalRow,
  transferSnapshot: TransferBillSnapshot,
  options: ApplyTransferStateOptions,
) {
  const nextState = mapTransferState(transferSnapshot.state);
  const now = new Date().toISOString();
  const failureReason = transferSnapshot.fail_reason || nextState.failureReason;

  await db.transaction(async (tx) => {
    await lockWithdrawalFinanceScope(
      tx as unknown as { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
      withdrawal.id,
    );

    const latest = await tx
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawal.id))
      .limit(1);

    if (latest.length === 0) {
      throw new Error('WITHDRAWAL_NOT_FOUND');
    }

    const currentWithdrawal = latest[0];
    const finalized = await hasFinalizedWithdrawalAccounting(tx, currentWithdrawal);
    let nextAccountingFinalized = finalized;

    if (nextState.internalStatus === 'processing' && finalized) {
      await moveFinalizedWithdrawalBackToProcessing(tx, currentWithdrawal, now);
      nextAccountingFinalized = false;
    }

    if (nextState.internalStatus === 'approved' && !finalized) {
      await finalizeWithdrawalAccounting(tx, currentWithdrawal, now);
      nextAccountingFinalized = true;
    }

    if (nextState.internalStatus === 'failed' && currentWithdrawal.status !== 'failed' && currentWithdrawal.status !== 'rejected') {
      await failWithdrawalAccounting(tx, currentWithdrawal, now, finalized);
      nextAccountingFinalized = false;
    }

    const nextReviewRemark =
      nextState.internalStatus === 'approved'
        ? (options.reviewComment?.trim() || '微信提现已到账')
        : nextState.internalStatus === 'failed'
          ? (failureReason || options.reviewComment?.trim() || '微信提现失败')
          : nextState.reviewRemark;

    await tx
      .update(withdrawals)
      .set({
        status: nextState.internalStatus,
        reviewerId: options.reviewerId || currentWithdrawal.reviewerId,
        reviewTime: currentWithdrawal.reviewTime || (options.reviewerId ? now : currentWithdrawal.reviewTime),
        reviewRemark: nextReviewRemark,
        thirdPartyTransactionId:
          transferSnapshot.transfer_bill_no
          || currentWithdrawal.thirdPartyTransactionId
          || currentWithdrawal.withdrawalNo,
        failureReason: nextState.internalStatus === 'failed' ? failureReason : null,
        accountInfo: buildTransferAccountInfo(
          currentWithdrawal,
          transferSnapshot,
          nextState.internalStatus,
          failureReason,
          nextAccountingFinalized,
        ),
        updatedAt: now,
      })
      .where(eq(withdrawals.id, currentWithdrawal.id));

    await safeLogFinanceAuditEvent({
      eventType: 'withdrawal_transfer_state_updated',
      status: nextState.internalStatus === 'failed' ? 'failed' : nextState.internalStatus === 'approved' ? 'success' : 'pending',
      userId: currentWithdrawal.userId,
      withdrawalId: currentWithdrawal.id,
      amount: toAmount(currentWithdrawal.amount),
      details: {
        source: options.source,
        transferState: normalizeTransferState(transferSnapshot.state),
        transferBillNo: transferSnapshot.transfer_bill_no || null,
        packageInfo: transferSnapshot.package_info || null,
        failureReason,
        nextStatus: nextState.internalStatus,
      },
      errorMessage: nextState.internalStatus === 'failed' ? failureReason : null,
    }, tx);
  });

  return {
    success: true,
    data: {
      status: nextState.internalStatus,
      transferState: normalizeTransferState(transferSnapshot.state),
      thirdPartyTransactionId: transferSnapshot.transfer_bill_no || withdrawal.thirdPartyTransactionId || withdrawal.withdrawalNo,
      failureReason,
      amount: toAmount(withdrawal.amount),
      fee: toAmount(withdrawal.feeAmount),
      actualAmount: toAmount(withdrawal.actualAmount),
    },
  };
}

export async function reconcileWithdrawalTransferStatus(withdrawalId: string) {
  const withdrawal = await getWithdrawalById(withdrawalId);
  if (!withdrawal) {
    return { success: false, error: 'WITHDRAWAL_NOT_FOUND' };
  }

  if (withdrawal.withdrawalType !== 'wechat' || !withdrawal.withdrawalNo) {
    return { success: true, data: { skipped: true } };
  }

  try {
    const transferSnapshot = await queryTransferBill(withdrawal.withdrawalNo);
    return await applyTransferStateToWithdrawal(withdrawal, transferSnapshot, {
      source: 'reconcile',
    });
  } catch (error: any) {
    await safeLogFinanceAuditEvent({
      eventType: 'withdrawal_transfer_reconcile_failed',
      status: 'failed',
      userId: withdrawal.userId,
      withdrawalId: withdrawal.id,
      amount: toAmount(withdrawal.amount),
      details: {
        withdrawalNo: withdrawal.withdrawalNo,
      },
      errorMessage: error.message || 'WITHDRAWAL_TRANSFER_RECONCILE_FAILED',
    });

    return {
      success: false,
      error: error.message || 'WITHDRAWAL_TRANSFER_RECONCILE_FAILED',
    };
  }
}

export async function reconcileRecentWechatWithdrawals(params?: {
  userId?: string;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(params?.limit || 10, 50));
  const conditions = [inArray(withdrawals.status, [...WITHDRAWAL_RECONCILE_STATUSES]), eq(withdrawals.withdrawalType, 'wechat')];

  if (params?.userId) {
    conditions.push(eq(withdrawals.userId, params.userId));
  }

  const rows = await db
    .select()
    .from(withdrawals)
    .where(and(...conditions))
    .orderBy(desc(withdrawals.createdAt))
    .limit(limit);

  for (const row of rows) {
    try {
      await reconcileWithdrawalTransferStatus(row.id);
    } catch (error) {
      console.error('[withdrawal] reconcile failed:', row.id, error);
    }
  }
}

export async function handleWithdrawalTransferNotification(params: {
  outBillNo: string;
  transferBillNo?: string;
  transferState?: string;
  failReason?: string;
  packageInfo?: string;
  updateTime?: string;
}) {
  const withdrawal = await getWithdrawalByNo(params.outBillNo);
  if (!withdrawal) {
    throw new Error('WITHDRAWAL_NOT_FOUND');
  }

  return applyTransferStateToWithdrawal(withdrawal, {
    out_bill_no: params.outBillNo,
    transfer_bill_no: params.transferBillNo,
    state: params.transferState,
    fail_reason: params.failReason,
    package_info: params.packageInfo,
    update_time: params.updateTime,
  }, {
    source: 'callback',
  });
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
      const accountInfo = parseAccountInfo(withdrawal);

      return {
        id: withdrawal.id,
        withdrawalNo: withdrawal.withdrawalNo,
        userId: withdrawal.userId,
        userPhone: user?.phone || '',
        userNickname: user?.nickname || '',
        amount: toAmount(withdrawal.amount),
        fee: toAmount(withdrawal.feeAmount),
        actualAmount: toAmount(withdrawal.actualAmount),
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

  const withdrawal = await getWithdrawalById(withdrawalId);

  if (!withdrawal) {
    return {
      success: false,
      error: 'WITHDRAWAL_NOT_FOUND',
    };
  }

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

  const accountInfo = parseAccountInfo(withdrawal);

  if (!accountInfo.openid) {
    return {
      success: false,
      error: 'WITHDRAWAL_OPENID_MISSING',
    };
  }

  const actualAmount = toAmount(withdrawal.actualAmount);

  const transferResult = await createTransferBill({
    outBillNo: withdrawal.withdrawalNo,
    openid: accountInfo.openid,
    transferAmountFen: Math.round(actualAmount * 100),
    transferRemark: `Withdrawal ${withdrawal.withdrawalNo}`,
    userName:
      Math.round(actualAmount * 100) >= WITHDRAWAL_NAME_REQUIRED_THRESHOLD_FEN
        ? accountInfo.accountName || undefined
        : undefined,
  });

  return applyTransferStateToWithdrawal(withdrawal, transferResult, {
    reviewerId,
    reviewComment,
    source: 'approval',
  });
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
        status: 'rejected',
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
