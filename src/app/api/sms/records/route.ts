import { NextRequest, NextResponse } from 'next/server';
import { getSmsRecords, getSmsStatistics } from '@/lib/sms-service';

/**
 * 获取短信记录列表
 * GET /api/sms/records
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const provider = searchParams.get('provider');
    const status = searchParams.get('status') as 'success' | 'failed' | null;
    const limit = searchParams.get('limit');
    const statistics = searchParams.get('statistics') === 'true';

    // 如果请求统计数据
    if (statistics) {
      const stats = getSmsStatistics();
      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    // 获取记录列表
    const records = getSmsRecords({
      phone: phone || undefined,
      provider: provider || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined
    });

    return NextResponse.json({
      success: true,
      data: records
    });
  } catch (error: any) {
    console.error('获取短信记录失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
