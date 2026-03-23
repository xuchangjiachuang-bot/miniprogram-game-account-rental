import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    return NextResponse.json(
      {
        success: false,
        error: '测试充值功能已下线',
        message: `管理员 ${auth.admin.username} 访问了已下线的测试充值接口`,
      },
      { status: 410 },
    );
  } catch (error: unknown) {
    console.error('[Admin Wallet Adjust] 已下线接口仍被访问:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '功能已下线' },
      { status: 500 },
    );
  }
}
