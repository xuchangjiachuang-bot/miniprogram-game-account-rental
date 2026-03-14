import { NextRequest, NextResponse } from 'next/server';
import { db, userBalances, users } from '@/lib/db';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { ensureUserBalance } from '@/lib/user-balance-service';

function normalizeBalance(row: { availableBalance?: unknown; frozenBalance?: unknown } | null | undefined) {
  return {
    availableBalance: Number(row?.availableBalance) || 0,
    frozenBalance: Number(row?.frozenBalance) || 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const userType = searchParams.get('userType');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const conditions = [];

    if (userType && userType !== 'all') {
      conditions.push(eq(users.userType, userType));
    }

    if (status && status !== 'all') {
      conditions.push(eq(users.status, status));
    }

    if (search) {
      conditions.push(
        or(
          like(users.phone, `%${search}%`),
          like(users.nickname, `%${search}%`),
        ),
      );
    }

    let query = db
      .select({
        user: {
          id: users.id,
          phone: users.phone,
          nickname: users.nickname,
          avatar: users.avatar,
          email: users.email,
          userType: users.userType,
          sellerLevel: users.sellerLevel,
          totalTrades: users.totalTrades,
          totalOrders: users.totalOrders,
          sellerRating: users.sellerRating,
          isVerified: users.isVerified,
          realName: users.realName,
          idCard: users.idCard,
          status: users.status,
          isDeleted: users.isDeleted,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastLoginAt: users.lastLoginAt,
        },
        balance: {
          availableBalance: userBalances.availableBalance,
          frozenBalance: userBalances.frozenBalance,
        },
      })
      .from(users)
      .leftJoin(userBalances, sql`${users.id}::text = ${userBalances.userId}`);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(desc(users.createdAt)) as typeof query;

    const allUsers = await query;
    const offset = (page - 1) * pageSize;
    const paginatedUsers = allUsers.slice(offset, offset + pageSize);

    const formattedUsers = await Promise.all(
      paginatedUsers.map(async (row) => {
        let balance = normalizeBalance(row.balance);

        if (!row.balance) {
          try {
            const ensuredBalance = await ensureUserBalance(row.user.id);
            balance = {
              availableBalance: ensuredBalance.availableBalance,
              frozenBalance: ensuredBalance.frozenBalance,
            };
          } catch (error) {
            console.error('[Admin Users] 初始化用户钱包失败:', row.user.id, error);
          }
        }

        return {
          ...row.user,
          walletBalance: balance.availableBalance,
          frozenBalance: balance.frozenBalance,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      total: allUsers.length,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取用户列表失败' },
      { status: 500 },
    );
  }
}
