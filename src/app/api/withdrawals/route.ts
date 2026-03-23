import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, withdrawals } from '@/lib/db';
import { reconcileRecentWechatWithdrawals } from '@/lib/withdrawal-service';
import { getUserBalance, requestWithdrawal } from '@/lib/user-balance-service';
import { resolveWechatWithdrawalOpenid, verifyToken } from '@/lib/user-service';

function mapWithdrawalMessage(message: string) {
  switch (message) {
    case 'INVALID_WITHDRAWAL_AMOUNT':
      return '提现金额必须大于 0';
    case 'WITHDRAWAL_AMOUNT_TOO_SMALL':
      return '提现金额过小，扣除手续费后实际到账金额必须大于 0';
    case 'INSUFFICIENT_AVAILABLE_BALANCE':
      return '提现金额超过可用余额';
    case 'NON_WITHDRAWABLE_BALANCE_LIMIT':
      return '当前可用余额中包含测试充值金额，测试充值金额不可提现';
    case 'WITHDRAWAL_CREATED':
      return '提现申请已提交，等待审核';
    case 'WITHDRAWAL_PROCESSING':
      return '提现已发起，微信零钱处理中';
    case 'WITHDRAWAL_APPROVED':
      return '提现已到账';
    case 'WITHDRAWAL_FAILED':
      return '微信提现失败，余额已退回';
    case 'WITHDRAWAL_REQUEST_FAILED':
      return '提现申请失败，请稍后重试';
    default:
      return message;
  }
}

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
        { status: 400 },
      );
    }

    const wechatOpenid = resolveWechatWithdrawalOpenid(user);
    if (!wechatOpenid) {
      return NextResponse.json(
        { success: false, error: '当前账号未绑定微信，无法发起微信提现' },
        { status: 400 },
      );
    }

    const accountInfo = {
      openid: wechatOpenid,
      accountName: '',
      phone: user.phone || '',
      nickname: user.username || '',
    };

    const result = await requestWithdrawal(user.id, amount, accountInfo);
    if (!result.success) {
      return NextResponse.json({ success: false, error: mapWithdrawalMessage(result.message) }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: mapWithdrawalMessage(result.message),
      data: {
        withdrawalId: result.withdrawalId,
        amount: result.amount,
        fee: result.fee,
        actualAmount: result.actualAmount,
        status: result.status || 'pending',
        thirdPartyTransactionId: result.thirdPartyTransactionId || null,
      },
    });
  } catch (error: any) {
    console.error('申请提现失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '申请提现失败',
      },
      { status: 500 },
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

    await reconcileRecentWechatWithdrawals({
      userId: user.id,
      limit: 10,
    });

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
      { status: 500 },
    );
  }
}
