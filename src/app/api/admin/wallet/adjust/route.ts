import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { db, users } from '@/lib/db';
import { addAvailableBalance, ensureUserBalance } from '@/lib/user-balance-service';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const amount = Number(body.amount);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '管理员测试充值';

    if (!phone && !userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户标识' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: '充值金额必须大于 0' },
        { status: 400 },
      );
    }

    const userList = await db
      .select({
        id: users.id,
        phone: users.phone,
        nickname: users.nickname,
      })
      .from(users)
      .where(phone ? eq(users.phone, phone) : eq(users.id, userId))
      .limit(1);

    if (userList.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 },
      );
    }

    const user = userList[0];
    await ensureUserBalance(user.id);

    const result = await addAvailableBalance(
      user.id,
      amount,
      `${reason}（管理员：${auth.admin.username}）`,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message || '充值失败' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: '测试余额充值成功',
      data: {
        userId: user.id,
        phone: user.phone,
        nickname: user.nickname,
        amount,
        oldBalance: result.oldBalance,
        newBalance: result.newBalance,
      },
    });
  } catch (error: unknown) {
    console.error('[Admin Wallet Adjust] 调账失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '调账失败' },
      { status: 500 },
    );
  }
}
