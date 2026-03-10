import { NextRequest, NextResponse } from 'next/server';
import { db, userBalances, users } from '@/lib/db';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

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
          like(users.nickname, `%${search}%`)
        )
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
      // `user_balances.user_id` is stored as varchar in the existing database.
      .leftJoin(userBalances, sql`${users.id}::text = ${userBalances.userId}`);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(users.createdAt)) as any;

    const allUsers = await query;
    const offset = (page - 1) * pageSize;
    const paginatedUsers = allUsers.slice(offset, offset + pageSize);

    const formattedUsers = paginatedUsers.map((row: any) => ({
      ...row.user,
      walletBalance: row.balance?.availableBalance || 0,
      frozenBalance: row.balance?.frozenBalance || 0,
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      total: allUsers.length,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取用户列表失败' },
      { status: 500 }
    );
  }
}
