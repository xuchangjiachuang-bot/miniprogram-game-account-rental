import { NextRequest, NextResponse } from 'next/server';
import { db, balanceTransactions, userBalances } from '@/lib/db';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';
import { getUserBalance } from '@/lib/user-balance-service';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const amount = Number(body.amount);
    const paymentMethod = body.payment_method || '余额充值';
    const paymentNo = body.payment_no || '';

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: '充值金额必须大于 0',
        },
        { status: 400 }
      );
    }

    if (amount < 1) {
      return NextResponse.json(
        {
          success: false,
          error: '最低充值金额为 1 元',
        },
        { status: 400 }
      );
    }

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

    if (!balance) {
      return NextResponse.json(
        {
          success: false,
          error: '初始化用户钱包失败',
        },
        { status: 500 }
      );
    }

    const oldAvailable = Number(balance.availableBalance) || 0;
    const newAvailable = oldAvailable + amount;
    const description = paymentNo
      ? `充值 ${amount} 元（${paymentMethod}，单号 ${paymentNo}）`
      : `充值 ${amount} 元（${paymentMethod}）`;

    await db.transaction(async (tx) => {
      await tx
        .update(userBalances)
        .set({
          availableBalance: newAvailable.toFixed(2),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userBalances.userId, user.id));

      await tx.insert(balanceTransactions).values({
        id: crypto.randomUUID(),
        userId: user.id,
        transactionType: 'deposit',
        amount: amount.toFixed(2),
        balanceBefore: oldAvailable.toFixed(2),
        balanceAfter: newAvailable.toFixed(2),
        description,
        createdAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({
      success: true,
      message: '充值成功',
      data: {
        amount,
        new_balance: newAvailable,
        payment_method: paymentMethod,
      },
    });
  } catch (error: any) {
    console.error('充值失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '充值失败',
      },
      { status: 500 }
    );
  }
}
