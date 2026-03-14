import { NextRequest, NextResponse } from 'next/server';
import { db, admins, withdrawals } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { reviewWithdrawalRequest } from '@/lib/withdrawal-service';

/**
 * 审核提现
 * POST /api/admin/withdrawals/[id]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 });
    }

    const admin = adminList[0];

    if (admin.status !== 'active') {
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { approved, remark } = body;

    if (typeof approved !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: '缺少审核结果'
      }, { status: 400 });
    }

    // 审核提现
    const result = await reviewWithdrawalRequest({
      withdrawalId: id,
      status: approved ? 'approved' : 'rejected',
      reviewComment: remark,
      reviewerId: admin.id,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || '审核提现失败'
      }, { status: 400 });
    }

    const thirdPartyTransactionId =
      result.data && 'thirdPartyTransactionId' in result.data
        ? result.data.thirdPartyTransactionId
        : null;

    return NextResponse.json({
      success: true,
      message: approved ? '提现已批准' : '提现已拒绝',
      data: {
        amount: result.data?.amount ?? 0,
        fee: result.data?.fee ?? 0,
        actualAmount: result.data?.actualAmount ?? 0,
        thirdPartyTransactionId,
      }
    });
  } catch (error: any) {
    console.error('审核提现失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '审核提现失败'
    }, { status: 500 });
  }
}

/**
 * 获取提现详情
 * GET /api/admin/withdrawals/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 });
    }

    const admin = adminList[0];

    if (admin.status !== 'active') {
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 });
    }

    const { id } = await params;

    // 获取提现记录
    const withdrawalList = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id))
      .limit(1);

    if (!withdrawalList || withdrawalList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提现记录不存在'
      }, { status: 404 });
    }

    const withdrawal = withdrawalList[0];

    return NextResponse.json({
      success: true,
      data: withdrawal
    });
  } catch (error: any) {
    console.error('获取提现详情失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取提现详情失败'
    }, { status: 500 });
  }
}
