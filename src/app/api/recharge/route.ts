import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import { getUserById } from '@/lib/user-service';
import { changeBalance, getUserBalance, UserType, TransactionType } from '@/lib/balance-service';

/**
 * 用户充值
 * POST /api/recharge
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    const body = await request.json();
    const { amount, payment_method, payment_no } = body;

    // 验证必填字段
    if (!amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: '充值金额必须大于0'
      }, { status: 400 });
    }

    if (amount < 1) {
      return NextResponse.json({
        success: false,
        error: '最低充值金额为1元'
      }, { status: 400 });
    }

    // 添加余额
    const changeResult = changeBalance({
      user_id: user.id,
      user_type: 'seller' as UserType,
      amount: amount,
      transaction_type: TransactionType.DEPOSIT,
      remark: `充值 ${amount} 元（${payment_method || '未知方式'}）`,
      related_order_id: payment_no || ''
    });

    if (!changeResult) {
      return NextResponse.json({
        success: false,
        error: '充值失败'
      }, { status: 500 });
    }

    // 获取更新后的余额
    const newBalance = getUserBalance(user.id);
    if (!newBalance) {
      return NextResponse.json({
        success: false,
        error: '获取余额信息失败'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '充值成功',
      data: {
        amount,
        new_balance: newBalance.available_balance + newBalance.frozen_balance,
        payment_method
      }
    });
  } catch (error: any) {
    console.error('充值失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '充值失败'
    }, { status: 500 });
  }
}
