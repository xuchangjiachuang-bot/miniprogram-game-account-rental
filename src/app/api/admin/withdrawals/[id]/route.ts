import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { admins, db, withdrawals } from '@/lib/db';
import {
  reconcileWithdrawalTransferStatus,
  reviewWithdrawalRequest,
} from '@/lib/withdrawal-service';

async function requireAdmin(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value;

  if (!adminToken) {
    return { error: NextResponse.json({ success: false, error: '未登录' }, { status: 401 }) };
  }

  const adminList = await db
    .select()
    .from(admins)
    .where(eq(admins.id, adminToken))
    .limit(1);

  if (adminList.length === 0) {
    return { error: NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 }) };
  }

  const admin = adminList[0];
  if (admin.status !== 'active') {
    return { error: NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 }) };
  }

  return { admin };
}

function resolveReviewMessage(nextStatus?: string) {
  switch (nextStatus) {
    case 'processing':
      return '提现已发起，等待微信零钱结果';
    case 'approved':
      return '提现已到账';
    case 'failed':
      return '微信提现失败，余额已退回';
    case 'rejected':
      return '提现已拒绝';
    default:
      return '提现状态已更新';
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    const body = await request.json();
    const { approved, remark } = body;

    if (typeof approved !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: '缺少审核结果',
      }, { status: 400 });
    }

    const result = await reviewWithdrawalRequest({
      withdrawalId: id,
      status: approved ? 'approved' : 'rejected',
      reviewComment: remark,
      reviewerId: auth.admin!.id,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'error' in result ? result.error || '审核提现失败' : '审核提现失败',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: resolveReviewMessage(result.data?.status),
      data: result.data || null,
    });
  } catch (error: any) {
    console.error('审核提现失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '审核提现失败',
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    await reconcileWithdrawalTransferStatus(id);

    const withdrawalList = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id))
      .limit(1);

    if (withdrawalList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提现记录不存在',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: withdrawalList[0],
    });
  } catch (error: any) {
    console.error('获取提现详情失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取提现详情失败',
    }, { status: 500 });
  }
}
