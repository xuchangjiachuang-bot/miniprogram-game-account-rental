import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { accounts, db, orders, splitRecords, users } from '@/lib/db';

type RecentActivity = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  href: string;
};

function toCount(value: unknown) {
  return Number(value) || 0;
}

function toAmount(value: unknown) {
  return Number(value) || 0;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    const [
      pendingAccountsResult,
      todayOrdersResult,
      totalUsersResult,
      platformIncomeResult,
      latestAccounts,
      latestOrders,
      latestUsers,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(accounts)
        .where(eq(accounts.auditStatus, 'pending')),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(gte(orders.createdAt, todayStartIso)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isDeleted, false)),
      db
        .select({ total: sql<number>`coalesce(sum(${splitRecords.splitAmount}), 0)` })
        .from(splitRecords)
        .where(and(eq(splitRecords.receiverType, 'platform'), eq(splitRecords.status, 'success'))),
      db
        .select({
          id: accounts.id,
          title: accounts.title,
          auditStatus: accounts.auditStatus,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .orderBy(desc(accounts.createdAt))
        .limit(3),
      db
        .select({
          id: orders.id,
          orderNo: orders.orderNo,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(3),
      db
        .select({
          id: users.id,
          nickname: users.nickname,
          phone: users.phone,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.isDeleted, false))
        .orderBy(desc(users.createdAt))
        .limit(3),
    ]);

    const recentActivities: RecentActivity[] = [
      ...latestAccounts.map((account) => ({
        id: `account-${account.id}`,
        title: '账号上架提交',
        description: `${account.title}，审核状态：${account.auditStatus}`,
        createdAt: account.createdAt || '',
        href: '/admin/accounts',
      })),
      ...latestOrders.map((order) => ({
        id: `order-${order.id}`,
        title: '订单创建',
        description: `${order.orderNo}，当前状态：${order.status}`,
        createdAt: order.createdAt || '',
        href: '/admin/orders',
      })),
      ...latestUsers.map((user) => ({
        id: `user-${user.id}`,
        title: '新用户注册',
        description: user.nickname || user.phone || user.id,
        createdAt: user.createdAt || '',
        href: '/admin/users',
      })),
    ]
      .filter((item) => item.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          pendingAccounts: toCount(pendingAccountsResult[0]?.count),
          todayOrders: toCount(todayOrdersResult[0]?.count),
          totalUsers: toCount(totalUsersResult[0]?.count),
          platformIncome: toAmount(platformIncomeResult[0]?.total),
        },
        recentActivities,
      },
    });
  } catch (error: unknown) {
    console.error('[Admin Dashboard] 获取统计数据失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取统计数据失败' },
      { status: 500 },
    );
  }
}
