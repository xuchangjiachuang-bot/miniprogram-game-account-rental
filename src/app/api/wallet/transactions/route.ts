import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getServerUserId } from '@/lib/server-auth';
import { db, balanceTransactions } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '请先登录',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const transactions = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.userId, userId))
      .orderBy(desc(balanceTransactions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        list: transactions.map((transaction) => ({
          id: transaction.id,
          transaction_no: transaction.id,
          user_id: transaction.userId,
          transaction_type: transaction.transactionType,
          amount: Number(transaction.amount) || 0,
          balance_before: Number(transaction.balanceBefore) || 0,
          balance_after: Number(transaction.balanceAfter) || 0,
          remark: transaction.description || '',
          created_at: transaction.createdAt,
        })),
        page,
        pageSize,
      },
    });
  } catch (error: any) {
    console.error('[Wallet] 获取交易记录失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取交易记录失败',
      },
      { status: 500 }
    );
  }
}
