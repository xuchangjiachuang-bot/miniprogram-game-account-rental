import { and, desc, eq, sql } from 'drizzle-orm';
import { db, users, withdrawals } from './db';

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
      ? await db.select().from(users).where(sql`id = ANY(${userIds})`)
      : [];

    const userMap = new Map(userList.map((user) => [user.id, user]));
    const offset = (page - 1) * pageSize;
    const paginatedWithdrawals = allWithdrawals.slice(offset, offset + pageSize);

    const formattedWithdrawals = paginatedWithdrawals.map((withdrawal) => {
      const user = userMap.get(withdrawal.userId);
      const accountInfo = (withdrawal.accountInfo || {}) as Record<string, any>;

      return {
        id: withdrawal.id,
        withdrawalNo: withdrawal.withdrawalNo,
        userId: withdrawal.userId,
        userPhone: user?.phone || '',
        userNickname: user?.nickname || '',
        amount: Number(withdrawal.amount) || 0,
        fee: Number(withdrawal.feeAmount) || 0,
        actualAmount: Number(withdrawal.actualAmount) || 0,
        type: withdrawal.withdrawalType || 'bank',
        accountNumber: accountInfo.accountNumber || accountInfo.alipayAccount || accountInfo.wechatAccount || '',
        accountName: accountInfo.accountName || '',
        bankName: accountInfo.bankName || '',
        status: withdrawal.status,
        applyTime: withdrawal.createdAt,
        processTime: withdrawal.reviewTime,
        reviewComment: withdrawal.reviewRemark,
        remark: withdrawal.remark,
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

export async function reviewWithdrawalRequest(params: {
  withdrawalId: string;
  status: 'approved' | 'rejected';
  reviewComment?: string;
  reviewerId: string;
}) {
  try {
    const { withdrawalId, status, reviewComment, reviewerId } = params;
    const { reviewWithdrawal } = await import('./user-balance-service');

    return await reviewWithdrawal(
      withdrawalId,
      status === 'approved',
      reviewerId,
      reviewComment || ''
    );
  } catch (error: any) {
    console.error('审核提现申请失败:', error);
    return {
      success: false,
      error: error.message || '审核提现申请失败',
    };
  }
}
