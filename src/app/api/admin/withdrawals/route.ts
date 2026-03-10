import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getWithdrawalRequests, reviewWithdrawalRequest } from '@/lib/withdrawal-service';

/**
 * 获取提现申请列表
 * GET /api/admin/withdrawals
 *
 * 查询参数：
 * - page: 页码
 * - pageSize: 每页数量
 * - status: 状态筛选
 */
export async function GET(request: NextRequest) {
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

    // 获取分页参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') as any;

    // 获取提现申请列表
    const result = await getWithdrawalRequests({ page, pageSize, status });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('获取提现申请列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取提现申请列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 审核提现申请
 * POST /api/admin/withdrawals
 *
 * 请求体：
 * - withdrawalId: 提现申请ID
 * - status: 审核状态（approved, rejected）
 * - reviewComment: 审核意见
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { withdrawalId, status, reviewComment } = body;

    if (!withdrawalId || !status) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '审核状态无效' },
        { status: 400 }
      );
    }

    // 审核提现申请
    const result = await reviewWithdrawalRequest({
      withdrawalId,
      status,
      reviewComment,
      reviewerId: admin.id
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: status === 'approved' ? '提现已批准' : '提现已拒绝'
    });
  } catch (error: any) {
    console.error('审核提现申请失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '审核提现申请失败' },
      { status: 500 }
    );
  }
}
