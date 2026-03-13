import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, balanceTransactions } from '@/lib/db';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';
import { reconcilePendingWechatWalletRechargesForUser } from '@/lib/wechat/payment-flow';

export async function GET(request: NextRequest) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '请先登录',
        },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '登录状态已失效，请重新登录',
        },
        { status: 401 }
      );
    }

    await reconcilePendingWechatWalletRechargesForUser(user.id);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const transactions = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.userId, user.id))
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
