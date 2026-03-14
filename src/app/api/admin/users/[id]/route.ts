import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { ensureUserBalance } from '@/lib/user-balance-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;

    const userList = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (userList.length === 0) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const user = userList[0];
    const balance = await ensureUserBalance(user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        availableBalance: balance.availableBalance,
        frozenBalance: balance.frozenBalance,
        totalEarned: balance.totalEarned,
        totalWithdrawn: balance.totalWithdrawn,
      },
    });
  } catch (error: unknown) {
    console.error('获取用户详情失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取用户详情失败' },
      { status: 500 },
    );
  }
}
