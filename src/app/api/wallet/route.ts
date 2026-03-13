import { NextRequest, NextResponse } from 'next/server';
import { db, userBalances } from '@/lib/db';
import { getServerToken } from '@/lib/server-auth';
import { getUserBalance } from '@/lib/user-balance-service';
import { verifyToken } from '@/lib/user-service';
import { reconcilePendingWechatWalletRechargesForUser } from '@/lib/wechat/payment-flow';

export async function GET(request: NextRequest) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '请先登录',
        },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '登录状态已失效，请重新登录',
        },
        { status: 401 }
      );
    }

    await reconcilePendingWechatWalletRechargesForUser(user.id);

    let balance = await getUserBalance(user.id);

    if (!balance) {
      await db.insert(userBalances).values({
        id: crypto.randomUUID(),
        userId: user.id,
        availableBalance: '0',
        frozenBalance: '0',
        totalWithdrawn: '0',
        totalEarned: '0',
      });

      balance = await getUserBalance(user.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
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
