import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/user-service';
import { getUserBalance, requestWithdrawal } from '@/lib/user-balance-service';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: '登录已过期' }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount || 0);
    const requestedType = typeof body.withdrawal_type === 'string' ? body.withdrawal_type : 'wechat';

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: '提现金额必须大于 0' }, { status: 400 });
    }

    if (requestedType !== 'wechat') {
      return NextResponse.json(
        { success: false, error: '当前仅支持微信提现，请先使用微信授权登录' },
        { status: 400 }
      );
    }

    if (!user.wechat_openid) {
      return NextResponse.json(
        { success: false, error: '当前账号未绑定微信，无法发起微信提现' },
        { status: 400 }
      );
    }

    const accountInfo = {
      openid: user.wechat_openid,
      accountName: user.realName || user.username || user.phone || '',
      phone: user.phone || '',
      nickname: user.username || '',
    };

    const result = await requestWithdrawal(user.id, amount, accountInfo);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        withdrawalId: result.withdrawalId,
        amount: result.amount,
        fee: result.fee,
        actualAmount: result.actualAmount,
      },
    });
  } catch (error: any) {
    console.error('申请提现失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '申请提现失败',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: '登录已过期' }, { status: 401 });
    }

    const { db, withdrawals } = await import('@/lib/db');
    const { desc, eq } = await import('drizzle-orm');
    const withdrawalList = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, user.id))
      .orderBy(desc(withdrawals.createdAt))
      .limit(20);

    const balance = await getUserBalance(user.id);

    return NextResponse.json({
      success: true,
      data: {
        withdrawals: withdrawalList,
        balance,
      },
    });
  } catch (error: any) {
    console.error('获取提现记录失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取提现记录失败',
      },
      { status: 500 }
    );
  }
}
