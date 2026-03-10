import { NextRequest, NextResponse } from 'next/server';
import { db, admins } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { systemConfigManager } from '@/storage/database/systemConfigManager';
import { broadcastConfigUpdate } from '@/lib/sse-broadcaster';

// GET /api/admin/homepage-config - 获取首页配置
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

    const config = await systemConfigManager.getHomepageConfig();
    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取配置失败'
    }, { status: 500 });
  }
}

// POST /api/admin/homepage-config - 保存首页配置
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

    const config = await request.json();

    // 验证配置格式
    if (!config || typeof config !== 'object') {
      return NextResponse.json({
        success: false,
        error: '配置格式错误'
      }, { status: 400 });
    }

    // 保存配置到数据库
    const savedConfig = await systemConfigManager.saveHomepageConfig(config);

    // 触发 SSE 推送事件，通知所有客户端配置已更新
    await broadcastConfigUpdate('all');

    return NextResponse.json({
      success: true,
      message: '配置保存成功',
      data: savedConfig
    });
  } catch (error) {
    console.error('保存配置失败:', error);
    return NextResponse.json({
      success: false,
      error: '保存配置失败'
    }, { status: 500 });
  }
}
