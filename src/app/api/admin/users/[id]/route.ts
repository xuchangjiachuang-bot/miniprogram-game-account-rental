import { NextRequest, NextResponse } from 'next/server';
import { db, userBalances, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;

    const userList = await db
      .select({
        user: users,
        balance: userBalances,
      })
      .from(users)
      .leftJoin(userBalances, eq(users.id, userBalances.userId))
      .where(eq(users.id, id))
      .limit(1);

    if (userList.length === 0) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const userData = userList[0];

    return NextResponse.json({
      success: true,
      data: {
        ...userData.user,
        availableBalance: userData.balance?.availableBalance || 0,
        frozenBalance: userData.balance?.frozenBalance || 0,
        totalEarned: userData.balance?.totalEarned || 0,
        totalWithdrawn: userData.balance?.totalWithdrawn || 0,
      },
    });
  } catch (error: any) {
    console.error('获取用户详情失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取用户详情失败' },
      { status: 500 }
    );
  }
}