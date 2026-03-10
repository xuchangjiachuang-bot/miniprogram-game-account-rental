import { NextRequest, NextResponse } from 'next/server';
import { db, balanceTransactions } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

/**
 * 获取交易记录
 * GET /api/wallet/transactions
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = token; // 临时方案

    // 获取分页参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 查询交易记录
    const transactions = await db.select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.userId, userId))
      .orderBy(desc(balanceTransactions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        list: transactions,
        page,
        pageSize,
      },
    });

  } catch (error: any) {
    console.error('[Wallet] 获取交易记录失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取交易记录失败',
    }, { status: 500 });
  }
}
