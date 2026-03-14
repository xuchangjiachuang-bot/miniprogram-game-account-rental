import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, withdrawals } from '@/lib/db';
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
