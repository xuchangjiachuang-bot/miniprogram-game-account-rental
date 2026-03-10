import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, admins } from '@/lib/db';
import { getSmsRecords, getSmsStatistics } from '@/lib/sms-service';

/**
 * 获取短信记录列表
 * GET /api/sms/records
 */
export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return NextResponse.json(
        {
          success: false,
          error: '请先登录管理员账号',
        },
        { status: 401 }
      );
    }

    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0 || adminList[0].status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: '管理员权限无效',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const provider = searchParams.get('provider');
    const status = searchParams.get('status') as 'success' | 'failed' | null;
    const limit = searchParams.get('limit');
    const statistics = searchParams.get('statistics') === 'true';

    if (statistics) {
      const stats = getSmsStatistics();
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    const records = getSmsRecords({
      phone: phone || undefined,
      provider: provider || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error: any) {
    console.error('获取短信记录失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
