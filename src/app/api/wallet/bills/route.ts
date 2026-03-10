import { NextRequest, NextResponse } from 'next/server';
import { db, balanceTransactions } from '@/lib/db';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

/**
 * 获取月度账单
 * GET /api/wallet/bills
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

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // 计算时间范围
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 查询月度总览
    const summary = await db
      .select({
        totalIncome: sql<number>`sum(case when ${balanceTransactions.amount} > 0 then ${balanceTransactions.amount} else 0 end)`,
        totalExpense: sql<number>`sum(case when ${balanceTransactions.amount} < 0 then abs(${balanceTransactions.amount}) else 0 end)`,
        transactionCount: sql<number>`count(*)`,
        firstTransactionDate: sql<string>`min(${balanceTransactions.createdAt})`,
        lastTransactionDate: sql<string>`max(${balanceTransactions.createdAt})`,
      })
      .from(balanceTransactions)
      .where(
        and(
          eq(balanceTransactions.userId, userId),
          gte(balanceTransactions.createdAt, startDate.toISOString()),
          lte(balanceTransactions.createdAt, endDate.toISOString())
        )
      );

    // 查询分类统计
    const categoryStats = await db
      .select({
        type: balanceTransactions.transactionType,
        totalIncome: sql<number>`sum(case when ${balanceTransactions.amount} > 0 then ${balanceTransactions.amount} else 0 end)`,
        totalExpense: sql<number>`sum(case when ${balanceTransactions.amount} < 0 then abs(${balanceTransactions.amount}) else 0 end)`,
        count: sql<number>`count(*)`,
      })
      .from(balanceTransactions)
      .where(
        and(
          eq(balanceTransactions.userId, userId),
          gte(balanceTransactions.createdAt, startDate.toISOString()),
          lte(balanceTransactions.createdAt, endDate.toISOString())
        )
      )
      .groupBy(balanceTransactions.transactionType)
      .orderBy(sql`count(*) desc`);

    // 查询交易记录
    const transactions = await db
      .select()
      .from(balanceTransactions)
      .where(
        and(
          eq(balanceTransactions.userId, userId),
          gte(balanceTransactions.createdAt, startDate.toISOString()),
          lte(balanceTransactions.createdAt, endDate.toISOString())
        )
      )
      .orderBy(desc(balanceTransactions.createdAt));

    // 按日期分组统计
    const dailyStats = await db
      .select({
        date: sql<string>`date(${balanceTransactions.createdAt})`,
        income: sql<number>`sum(case when ${balanceTransactions.amount} > 0 then ${balanceTransactions.amount} else 0 end)`,
        expense: sql<number>`sum(case when ${balanceTransactions.amount} < 0 then abs(${balanceTransactions.amount}) else 0 end)`,
        count: sql<number>`count(*)`,
      })
      .from(balanceTransactions)
      .where(
        and(
          eq(balanceTransactions.userId, userId),
          gte(balanceTransactions.createdAt, startDate.toISOString()),
          lte(balanceTransactions.createdAt, endDate.toISOString())
        )
      )
      .groupBy(sql`date(${balanceTransactions.createdAt})`)
      .orderBy(sql`date(${balanceTransactions.createdAt})`);

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        summary: {
          totalIncome: summary[0]?.totalIncome || 0,
          totalExpense: summary[0]?.totalExpense || 0,
          netIncome: (summary[0]?.totalIncome || 0) - (summary[0]?.totalExpense || 0),
          transactionCount: summary[0]?.transactionCount || 0,
          firstTransactionDate: summary[0]?.firstTransactionDate,
          lastTransactionDate: summary[0]?.lastTransactionDate,
        },
        categoryStats,
        dailyStats,
        transactions,
      },
    });

  } catch (error: any) {
    console.error('[Wallet] 获取月度账单失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取月度账单失败',
    }, { status: 500 });
  }
}
