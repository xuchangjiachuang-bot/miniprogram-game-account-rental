import { NextRequest, NextResponse } from 'next/server';
import { getServerToken } from '@/lib/server-auth';
import { ensureUserBalance } from '@/lib/user-balance-service';
import { verifyToken } from '@/lib/user-service';

export async function GET(request: NextRequest) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '请先登录',
        },
        { status: 401 },
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '登录状态已失效，请重新登录',
        },
        { status: 401 },
      );
    }

    const balance = await ensureUserBalance(user.id);

    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        available_balance: balance.availableBalance,
        frozen_balance: balance.frozenBalance,
        total_balance: balance.availableBalance + balance.frozenBalance,
        total_withdrawn: balance.totalWithdrawn,
        total_recharged: 0,
        total_income: balance.totalEarned,
        total_refund: 0,
      },
    });
  } catch (error: unknown) {
    console.error('[Wallet] 获取钱包信息失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取钱包信息失败',
      },
      { status: 500 },
    );
  }
}
