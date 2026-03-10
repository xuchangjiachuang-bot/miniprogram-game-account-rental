import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, userBalances } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: '请先登录',
        },
        { status: 401 }
      );
    }

    const userId = authHeader.substring(7);

    const [balance] = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, userId))
      .limit(1);

    if (!balance) {
      await db.insert(userBalances).values({
        id: crypto.randomUUID(),
        userId,
        availableBalance: '0',
        frozenBalance: '0',
        totalWithdrawn: '0',
        totalEarned: '0',
      });

      return NextResponse.json({
        success: true,
        data: {
          userId,
          availableBalance: '0',
          frozenBalance: '0',
          totalWithdrawn: '0',
          totalEarned: '0',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: balance,
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
