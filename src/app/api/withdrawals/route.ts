import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/user-service';
import { requestWithdrawal, getUserBalance } from '@/lib/user-balance-service';

/**
 * 申请提现
 * POST /api/withdrawals
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const authHeader = request.headers.get('authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 });
    }

    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '登录已过期'
      }, { status: 401 });
    }

    const body = await request.json();
    const { amount, accountInfo } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: '提现金额必须大于0'
      }, { status: 400 });
    }

    if (!accountInfo) {
      return NextResponse.json({
        success: false,
        error: '缺少账户信息'
      }, { status: 400 });
    }

    // 申请提现
    const result = await requestWithdrawal(user.id, amount, accountInfo);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          withdrawalId: result.withdrawalId,
          amount: result.amount,
          fee: result.fee,
          actualAmount: result.actualAmount
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('申请提现失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '申请提现失败'
    }, { status: 500 });
  }
}

/**
 * 获取用户提现记录
 * GET /api/withdrawals
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const authHeader = request.headers.get('authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 });
    }

    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '登录已过期'
      }, { status: 401 });
    }

    // 获取用户的提现记录
    const { db, withdrawals } = await import('@/lib/db');
    const { eq } = await import('drizzle-orm');

    const withdrawalList = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, user.id))
      .orderBy(withdrawals.createdAt)
      .limit(20);

    // 获取用户余额
    const balance = await getUserBalance(user.id);

    return NextResponse.json({
      success: true,
      data: {
        withdrawals: withdrawalList,
        balance: balance
      }
    });
  } catch (error: any) {
    console.error('获取提现记录失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取提现记录失败'
    }, { status: 500 });
  }
}
