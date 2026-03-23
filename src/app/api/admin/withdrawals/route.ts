import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { admins, db } from '@/lib/db';
import {
  getWithdrawalRequests,
  reconcileRecentWechatWithdrawals,
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    await reconcileRecentWechatWithdrawals({ limit: 20 });

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = searchParams.get('status') as string | null;

    const result = await getWithdrawalRequests({ page, pageSize, status: status || undefined });
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'error' in result ? result.error || '审核提现申请失败' : '审核提现申请失败',
      }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('获取提现申请列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取提现申请列表失败' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const { withdrawalId, status, reviewComment } = body;

    if (!withdrawalId || !status) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 },
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '审核状态无效' },
        { status: 400 },
      );
    }

    const result = await reviewWithdrawalRequest({
      withdrawalId,
      status,
      reviewComment,
      reviewerId: auth.admin!.id,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: resolveReviewMessage(result.data?.status),
      data: result.data || null,
    });
  } catch (error: any) {
    console.error('审核提现申请失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '审核提现申请失败' },
      { status: 500 },
    );
  }
}
