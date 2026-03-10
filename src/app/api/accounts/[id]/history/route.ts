import { NextRequest, NextResponse } from 'next/server';
import { db, accountEditHistory } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

/**
 * 获取账号编辑历史记录
 * GET /api/accounts/[id]/history
 *
 * 返回指定账号的所有编辑历史记录
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('GET /api/accounts/[id]/history - id:', id);

    // 判断是否是UUID格式
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 需要导入accounts表来获取UUID
    let accountId = id;
    if (!isUUID) {
      // 如果不是UUID，需要先查询账号的UUID
      const { accounts } = await import('@/lib/db');
      const accountList = await db
        .select()
        .from(accounts)
        .where(eq(accounts.accountId, id));

      if (accountList.length === 0) {
        return NextResponse.json({
          success: false,
          error: '账号不存在'
        }, { status: 404 });
      }

      accountId = accountList[0].id;
    }

    // 查询编辑历史记录（按时间倒序）
    const history = await db
      .select()
      .from(accountEditHistory)
      .where(eq(accountEditHistory.accountId, accountId))
      .orderBy(desc(accountEditHistory.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        total: history.length,
        history: history
      }
    });
  } catch (error: any) {
    console.error('获取编辑历史失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取编辑历史失败'
    }, { status: 500 });
  }
}
