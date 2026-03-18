import { NextRequest, NextResponse } from 'next/server';
import { db, admins, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getPendingVerificationApplications, reviewVerificationApplication } from '@/lib/verification-manual-service';
import { resolveStoredFileReference } from '@/lib/storage-service';

function normalizeAuditPhoneDisplay(phone?: string | null) {
  const trimmed = phone?.trim() || '';
  if (!trimmed) {
    return '';
  }

  if (/^(wx|wechat)_[a-z0-9]+$/i.test(trimmed)) {
    return '';
  }

  return /^1[3-9]\d{9}$/.test(trimmed) ? trimmed : '';
}

/**
 * 获取待审核的实名认证申请列表
 * GET /api/admin/verification-requests
 *
 * 查询参数：
 * - page: 页码
 * - pageSize: 每页数量
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

    // 获取待审核申请列表
    const result = await getPendingVerificationApplications(page, pageSize);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // 补充用户信息
    const applicationsWithUserInfo = await Promise.all(
      (result.data || []).map(async app => {
        const appUserList = await db
          .select({
            phone: users.phone,
            nickname: users.nickname,
          })
          .from(users)
          .where(eq(users.id, app.userId))
          .limit(1);
        const appUser = appUserList[0];
        const [frontUrl, backUrl] = await Promise.all([
          resolveStoredFileReference(app.idCardFrontUrl, 30 * 24 * 3600),
          resolveStoredFileReference(app.idCardBackUrl, 30 * 24 * 3600),
        ]);

        return {
          ...app,
          idCardFrontUrl: frontUrl || '',
          idCardBackUrl: backUrl || '',
          userPhone: normalizeAuditPhoneDisplay(appUser?.phone),
          userName: appUser?.nickname || ''
        };
      })
    ) || [];

    return NextResponse.json({
      success: true,
      data: applicationsWithUserInfo,
      total: result.total
    });
  } catch (error: any) {
    console.error('获取待审核实名认证申请失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取待审核实名认证申请失败' },
      { status: 500 }
    );
  }
}

/**
 * 审核实名认证申请
 * POST /api/admin/verification-requests
 *
 * 请求体：
 * - applicationId: 申请ID
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
    const { applicationId, status, reviewComment } = body;

    if (!applicationId || !status) {
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

    // 审核申请
    const result = await reviewVerificationApplication({
      applicationId,
      status,
      reviewComment,
      reviewerId: admin.id,
      reviewerName: admin.name || undefined, // 传递管理员名称
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: status === 'approved' ? '审核通过' : '审核已拒绝'
    });
  } catch (error: any) {
    console.error('审核实名认证申请失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '审核实名认证申请失败' },
      { status: 500 }
    );
  }
}
