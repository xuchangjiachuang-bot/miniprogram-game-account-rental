import { NextRequest, NextResponse } from 'next/server';
import { db, admins, agreements } from '@/lib/db';
import { eq, or, sql } from 'drizzle-orm';
import { broadcastConfigUpdate } from '@/lib/sse-broadcaster';
import { ensureAgreementsInitialized } from '@/lib/db';

/**
 * 获取所有协议
 * GET /api/admin/agreements
 */
export async function GET() {
  try {
    // 确保协议表已初始化
    await ensureAgreementsInitialized();

    // 获取所有协议（无需验证权限，因为协议是公开的）
    const allAgreements = await db
      .select()
      .from(agreements)
      .orderBy(agreements.createdAt);

    // 返回Map格式，方便前端使用
    const agreementsMap = allAgreements.reduce((acc, agreement) => {
      acc[agreement.key] = agreement;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: allAgreements,
      map: agreementsMap
    });
  } catch (error: any) {
    console.error('获取协议失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取协议失败'
    }, { status: 500 });
  }
}

/**
 * 创建或更新协议
 * PUT /api/admin/agreements
 */
export async function PUT(request: NextRequest) {
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
    const { key, title, content, enabled } = body;

    // 验证必填字段
    if (!key || !title || !content) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必填字段：key、title、content' 
      }, { status: 400 });
    }

    // 检查是否已存在该key的协议
    const [existing] = await db
      .select()
      .from(agreements)
      .where(eq(agreements.key, key))
      .limit(1);

    if (existing) {
      // 更新现有协议
      await db
        .update(agreements)
        .set({
          title,
          content,
          enabled: enabled !== undefined ? enabled : true,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(agreements.id, existing.id));
    } else {
      // 创建新协议
      await db.insert(agreements).values({
        key,
        title,
        content,
        enabled: enabled !== undefined ? enabled : true,
      });
    }

    // 广播配置更新事件
    broadcastConfigUpdate('settings');

    return NextResponse.json({
      success: true,
      message: '协议已保存',
      data: { key, title, content, enabled }
    });
  } catch (error: any) {
    console.error('保存协议失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '保存协议失败'
    }, { status: 500 });
  }
}

/**
 * 批量保存协议
 * POST /api/admin/agreements/batch
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
    const { agreements: agreementsData } = body;

    if (!Array.isArray(agreementsData)) {
      return NextResponse.json({ 
        success: false, 
        error: '参数错误：agreements必须是数组' 
      }, { status: 400 });
    }

    // 批量保存协议
    for (const agreement of agreementsData) {
      const { key, title, content, enabled } = agreement;

      // 验证必填字段
      if (!key || !title || !content) {
        continue;
      }

      // 检查是否已存在该key的协议
      const [existing] = await db
        .select()
        .from(agreements)
        .where(eq(agreements.key, key))
        .limit(1);

      if (existing) {
        // 更新现有协议
        await db
          .update(agreements)
          .set({
            title,
            content,
            enabled: enabled !== undefined ? enabled : true,
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(agreements.id, existing.id));
      } else {
        // 创建新协议
        await db.insert(agreements).values({
          key,
          title,
          content,
          enabled: enabled !== undefined ? enabled : true,
        });
      }
    }

    // 广播配置更新事件
    broadcastConfigUpdate('settings');

    return NextResponse.json({
      success: true,
      message: '协议已批量保存'
    });
  } catch (error: any) {
    console.error('批量保存协议失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '批量保存协议失败'
    }, { status: 500 });
  }
}
