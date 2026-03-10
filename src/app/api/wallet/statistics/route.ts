import { NextRequest, NextResponse } from 'next/server';
import { db, balanceTransactions, userBalances } from '@/lib/db';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

/**
 * 获取钱包统计数据
 * GET /api/wallet/statistics
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
    const period = searchParams.get('period') || 'month'; // week, month, year

    // 计算时间范围
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 查询余额信息
    const [balance] = await db.select().from(userBalances).where(eq(userBalances.userId, userId)).limit(1);

    if (!balance) {
      return NextResponse.json({
        success: false,
        error: '用户余额不存在',
      }, { status: 404 });
    }

    // 查询收入统计
    const incomeResult = await db
      .select({
        total: sql<number>`sum(${balanceTransactions.amount})`,
        count: sql<number>`count(*)`,
      })
      .from(balanceTransactions)
      .where(
        and(
          eq(balanceTransactions.userId, userId),
          gte(balanceTransactions.createdAt, startDate.toISOString()),
          lte(balanceTransactions.createdAt, now.toISOString()),
          sql`${balanceTransactions.amount} > 0`
        )
      );

    // 查询支出统计
    const expenseResult = await db
      .select({
        total: sql<number>`sum(ABS(${balanceTransactions.amount}))`,
        count: sql<number>`count(*)`,
      })
      .from(balanceTransactions)
      .where(
        and(
          eq(balanceTransactions.userId, userId),
          gte(balanceTransactions.createdAt, startDate.toISOString()),
          lte(balanceTransactions.createdAt, now.toISOString()),
          sql`${balanceTransactions.amount} < 0`
        )
      );

    // 查询每日统计
    const dailyStats = await db
      .select({
        date: sql<string>`date(${balanceTransactions.createdAt})`,
        income: sql<number>`sum(case when ${balanceTransactions.amount} > 0 then ${balanceTransactions.amount} else 0 end)`,
        expense: sql<number>`sum(case when ${balanceTransactions.amount} < 0 then abs(${balanceTransactions.amount}) else 0 end)`,
      })
      .from(balanceTransactions)
      .where(
        and(
          eq(balanceTransactions.userId, userId),
          gte(balanceTransactions.createdAt, startDate.toISOString()),
          lte(balanceTransactions.createdAt, now.toISOString())
        )
      )
      .groupBy(sql`date(${balanceTransactions.createdAt})`)
      .orderBy(sql`date(${balanceTransactions.createdAt})`);

    // 查询月度统计（如果是年周期）
    let monthlyStats: any[] = [];
    if (period === 'year') {
      monthlyStats = await db
        .select({
          month: sql<string>`to_char(${balanceTransactions.createdAt}, 'YYYY-MM')`,
          income: sql<number>`sum(case when ${balanceTransactions.amount} > 0 then ${balanceTransactions.amount} else 0 end)`,
          expense: sql<number>`sum(case when ${balanceTransactions.amount} < 0 then abs(${balanceTransactions.amount}) else 0 end)`,
        })
        .from(balanceTransactions)
        .where(
          and(
            eq(balanceTransactions.userId, userId),
            gte(balanceTransactions.createdAt, startDate.toISOString()),
            lte(balanceTransactions.createdAt, now.toISOString())
          )
        )
        .groupBy(sql`to_char(${balanceTransactions.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${balanceTransactions.createdAt}, 'YYYY-MM')`);
    }

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        balance: {
          availableBalance: balance.availableBalance,
          frozenBalance: balance.frozenBalance,
          totalEarned: balance.totalEarned,
          totalWithdrawn: balance.totalWithdrawn,
        },
        summary: {
          totalIncome: incomeResult[0]?.total || 0,
          incomeCount: incomeResult[0]?.count || 0,
          totalExpense: expenseResult[0]?.total || 0,
          expenseCount: expenseResult[0]?.count || 0,
          netIncome: (incomeResult[0]?.total || 0) - (expenseResult[0]?.total || 0),
        },
        dailyStats,
        monthlyStats,
      },
    });

  } catch (error: any) {
    console.error('[Wallet] 获取统计数据失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取统计数据失败',
    }, { status: 500 });
  }
}
