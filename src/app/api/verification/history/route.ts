import { NextRequest, NextResponse } from 'next/server';
import { db, verificationApplications } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

/**
 * 获取实名认证历史记录
 * GET /api/verification/history
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = token; // 临时方案

    // 查询认证历史记录
    const history = await db
      .select()
      .from(verificationApplications)
      .where(eq(verificationApplications.userId, userId))
      .orderBy(desc(verificationApplications.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        list: history,
        total: history.length,
      },
    });

  } catch (error: any) {
    console.error('[Verification] 获取历史记录失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取历史记录失败',
    }, { status: 500 });
  }
}
