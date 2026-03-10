import { NextRequest, NextResponse } from 'next/server';
import {
  freezeListingDeposit,
  refundListingDeposit,
  getAccountDeposit
} from '@/lib/account-deposit-service';

/**
 * 账号保证金操作
 * POST /api/accounts/[id]/deposit
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, userId, reason } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户ID不能为空'
      }, { status: 400 });
    }

    if (action === 'freeze') {
      // 冻结保证金
      const result = await freezeListingDeposit(id, userId);
      return NextResponse.json(result);
    } else if (action === 'refund') {
      // 退还保证金
      if (!reason || !['cancelled', 'completed', 'rejected'].includes(reason)) {
        return NextResponse.json({
          success: false,
          error: '退还原因无效，必须是 cancelled、completed 或 rejected'
        }, { status: 400 });
      }
      const result = await refundListingDeposit(id, reason);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({
        success: false,
        error: '未知的操作'
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 获取账号保证金信息
 * GET /api/accounts/[id]/deposit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await getAccountDeposit(id);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
