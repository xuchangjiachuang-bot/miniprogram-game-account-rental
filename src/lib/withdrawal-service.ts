import { and, desc, eq, sql } from 'drizzle-orm';
import { balanceTransactions, db, userBalances, users, withdrawals } from './db';
import { createTransferBill } from '@/lib/wechat/v3';

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

    const allWithdrawals = (await baseQuery.orderBy(desc(withdrawals.createdAt))) as any[];
    const userIds = Array.from(
      new Set(allWithdrawals.map((withdrawal) => withdrawal.userId).filter(Boolean))
    );

    const userList = userIds.length
      ? await db
          .select({
            id: users.id,
            phone: users.phone,
            nickname: users.nickname,
          })
          .from(users)
          .where(sql`id = ANY(${userIds})`)
      : [];

    const userMap = new Map(userList.map((user) => [user.id, user]));
    const offset = (page - 1) * pageSize;
    const paginatedWithdrawals = allWithdrawals.slice(offset, offset + pageSize);

    const formattedWithdrawals = paginatedWithdrawals.map((withdrawal) => {
      const user = userMap.get(withdrawal.userId);
      const accountInfo = typeof withdrawal.accountInfo === 'string'
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
        accountNumber: accountInfo.accountNumber || accountInfo.alipayAccount || accountInfo.wechatAccount || accountInfo.openid || '',
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
    console.error('获取提现申请列表失败:', error);
    return {
      success: false,
      error: error.message || '获取提现申请列表失败',
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
      error: '提现申请不存在',
    };
  }

  const withdrawal = rows[0];
  if (withdrawal.status !== 'pending') {
    return {
      success: false,
      error: `提现状态不正确，当前状态：${withdrawal.status}`,
    };
  }

  const accountInfo = typeof withdrawal.accountInfo === 'string'
    ? JSON.parse(withdrawal.accountInfo || '{}')
    : ((withdrawal.accountInfo || {}) as Record<string, any>);

  if (!accountInfo.openid) {
    return {
      success: false,
      error: '提现用户缺少微信 openid，无法发起新版商家转账',
    };
  }

  const actualAmount = Number(withdrawal.actualAmount) || 0;
  const amount = Number(withdrawal.amount) || 0;
  const fee = Number(withdrawal.feeAmount) || 0;

  const transferResult = await createTransferBill({
    outBillNo: withdrawal.withdrawalNo,
    openid: accountInfo.openid,
    transferAmountFen: Math.round(actualAmount * 100),
    transferRemark: `用户提现 ${withdrawal.withdrawalNo}`,
    userName: accountInfo.accountName || undefined,
    userRecvPerception: '平台提现到账',
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
      id: crypto.randomUUID(),
      userId: withdrawal.userId,
      withdrawalId: withdrawal.id,
      transactionType: 'withdraw',
      amount: amount.toFixed(2),
      balanceBefore: '0.00',
      balanceAfter: '0.00',
      description: `微信提现 ${actualAmount.toFixed(2)} 元`,
      createdAt: now,
    });

    await tx
      .update(withdrawals)
      .set({
        status: 'approved',
        reviewerId,
        reviewTime: now,
        reviewRemark: reviewComment || '已发起微信商家转账',
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
    const result = await reviewWithdrawal(
      withdrawalId,
      false,
      reviewerId,
      reviewComment || ''
    );

    if (!result.success) {
      return {
        success: false,
        error: result.message || '审核提现申请失败',
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
    console.error('审核提现申请失败:', error);
    return {
      success: false,
      error: error.message || '审核提现申请失败',
    };
  }
}
