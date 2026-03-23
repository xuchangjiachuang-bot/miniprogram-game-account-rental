import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, admins, users } from '@/lib/db';
import {
  listVerificationApplications,
  reviewVerificationApplication,
  type VerificationStatus,
} from '@/lib/verification-manual-service';
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

async function requireVerificationAdmin(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value;

  if (!adminToken) {
    return { error: NextResponse.json({ success: false, error: '未登录' }, { status: 401 }) };
  }

  const adminList = await db.select().from(admins).where(eq(admins.id, adminToken)).limit(1);
  if (adminList.length === 0) {
    return {
      error: NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 }),
    };
  }

  const admin = adminList[0];
  if (admin.status !== 'active') {
    return {
      error: NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 }),
    };
  }

  return { admin };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireVerificationAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = (searchParams.get('status') || 'pending') as 'all' | VerificationStatus;

    const result = await listVerificationApplications({ page, pageSize, status });
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const applicationsWithUserInfo = await Promise.all(
      (result.data || []).map(async (app) => {
        const appUserList = await db
          .select({
            phone: users.phone,
            nickname: users.nickname,
            isVerified: users.isVerified,
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
          userPhone: normalizeAuditPhoneDisplay(app.phone || appUser?.phone),
          userName: appUser?.nickname || '',
          userVerified: Boolean(appUser?.isVerified),
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: applicationsWithUserInfo,
      total: result.total || 0,
      page,
      pageSize,
      status,
    });
  } catch (error: any) {
    console.error('获取实名认证申请失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取实名认证申请失败' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireVerificationAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const { applicationId, status, reviewComment } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: '审核状态无效' }, { status: 400 });
    }

    const result = await reviewVerificationApplication({
      applicationId,
      status,
      reviewComment,
      reviewerId: auth.admin.id,
      reviewerName: auth.admin.name || undefined,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: status === 'approved' ? '审核通过' : '已驳回实名认证',
    });
  } catch (error: any) {
    console.error('审核实名认证申请失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '审核实名认证申请失败' },
      { status: 500 },
    );
  }
}
