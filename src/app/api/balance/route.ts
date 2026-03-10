import { NextRequest, NextResponse } from 'next/server';
import {
  getUserBalance,
  getUserTransactions,
  createUserBalance,
  changeBalance,
  ChangeBalanceParams,
  TransactionType
} from '@/lib/balance-service';

/**
 * 获取用户余额
 * GET /api/balance?user_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const type = searchParams.get('type'); // 'balance' or 'transactions'

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少 user_id 参数'
      }, { status: 400 });
    }

    if (type === 'transactions') {
      // 获取交易记录
      const transactions = getUserTransactions(userId);
      return NextResponse.json({
        success: true,
        data: transactions
      });
    } else {
      // 获取余额信息
      const balance = getUserBalance(userId);
      return NextResponse.json({
        success: true,
        data: balance
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 创建用户余额
 * POST /api/balance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { user_id, user_type } = body;

    if (!user_id || !user_type) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段'
      }, { status: 400 });
    }

    const balance = createUserBalance(user_id, user_type);

    return NextResponse.json({
      success: true,
      message: '用户余额创建成功',
      data: balance
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
