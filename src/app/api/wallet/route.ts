import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import { db, userBalances } from '@/lib/db';
import { getUserBalance } from '@/lib/user-balance-service';

export async function GET(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '请先登录',
        },
        { status: 401 }
      );
    }

    let balance = await getUserBalance(userId);

    if (!balance) {
      await db.insert(userBalances).values({
        id: crypto.randomUUID(),
        userId,
        availableBalance: '0',
        frozenBalance: '0',
        totalWithdrawn: '0',
        totalEarned: '0',
      });

      balance = await getUserBalance(userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        available_balance: balance?.availableBalance || 0,
        frozen_balance: balance?.frozenBalance || 0,
        total_balance: (balance?.availableBalance || 0) + (balance?.frozenBalance || 0),
        total_withdrawn: balance?.totalWithdrawn || 0,
        total_recharged: 0,
        total_income: balance?.totalEarned || 0,
        total_refund: 0,
      },
    });
  } catch (error: any) {
    console.error('[Wallet] 获取钱包信息失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取钱包信息失败',
      },
      { status: 500 }
    );
  }
}
