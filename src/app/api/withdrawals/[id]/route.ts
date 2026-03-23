import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, withdrawals } from '@/lib/db';
import { getWechatPayV3Config } from '@/lib/wechat/v3';
import { reconcileWithdrawalTransferStatus } from '@/lib/withdrawal-service';
import { verifyToken } from '@/lib/user-service';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
}

async function requireUser(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 });
    }

    const { id } = await params;
    const rows = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id))
      .orderBy(desc(withdrawals.createdAt))
      .limit(1);

    const withdrawal = rows[0];
    if (!withdrawal || withdrawal.userId !== user.id) {
      return NextResponse.json({ success: false, error: '提现记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: withdrawal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取提现详情失败' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录或登录已失效' }, { status: 401 });
    }

    const { id } = await params;
    await reconcileWithdrawalTransferStatus(id);

    const rows = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id))
      .orderBy(desc(withdrawals.createdAt))
      .limit(1);

    const withdrawal = rows[0];
    if (!withdrawal || withdrawal.userId !== user.id) {
      return NextResponse.json({ success: false, error: '提现记录不存在' }, { status: 404 });
    }

    const accountInfo =
      typeof withdrawal.accountInfo === 'string'
        ? JSON.parse(withdrawal.accountInfo || '{}')
        : (withdrawal.accountInfo || {});

    if (withdrawal.status === 'approved') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'approved',
        },
      });
    }

    if (withdrawal.status !== 'processing') {
      return NextResponse.json({
        success: false,
        error: '当前提现状态不支持收款确认',
      }, { status: 400 });
    }

    if (!accountInfo.transferPackageInfo) {
      return NextResponse.json({
        success: false,
        error: '当前提现还未进入待确认收款状态，请稍后刷新再试',
      }, { status: 400 });
    }

    const config = await getWechatPayV3Config();

    return NextResponse.json({
      success: true,
      data: {
        status: 'processing',
        appId: config.mpAppId || config.appid,
        mchId: config.mchid,
        packageInfo: accountInfo.transferPackageInfo,
        transferState: accountInfo.transferState || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取提现确认信息失败' }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: '提现审核已统一迁移到后台管理接口 /api/admin/withdrawals',
    },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: '提现删除入口已停用，请使用当前统一提现链路',
    },
    { status: 410 }
  );
}
