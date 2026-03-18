import { NextRequest, NextResponse } from 'next/server';
import { normalizeHomepageConfig } from '@/lib/homepage-config-normalizer';
import { requireAdmin } from '@/lib/admin-auth';
import { broadcastConfigUpdate } from '@/lib/sse-broadcaster';
import { systemConfigManager } from '@/storage/database/systemConfigManager';

export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request);
    if (adminAuth.error) {
      return adminAuth.error;
    }

    const config = await systemConfigManager.getHomepageConfig();
    return NextResponse.json({
      success: true,
      data: normalizeHomepageConfig(config),
    });
  } catch (error) {
    console.error('[GET /api/admin/homepage-config] Failed:', error);
    return NextResponse.json({
      success: false,
      error: '获取配置失败',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request);
    if (adminAuth.error) {
      return adminAuth.error;
    }

    const config = await request.json();
    if (!config || typeof config !== 'object') {
      return NextResponse.json({
        success: false,
        error: '配置格式错误',
      }, { status: 400 });
    }

    const normalizedConfig = normalizeHomepageConfig(config);
    const savedConfig = await systemConfigManager.saveHomepageConfig(normalizedConfig);
    await broadcastConfigUpdate('all');

    return NextResponse.json({
      success: true,
      message: '配置保存成功',
      data: savedConfig,
    });
  } catch (error) {
    console.error('[POST /api/admin/homepage-config] Failed:', error);
    return NextResponse.json({
      success: false,
      error: '保存配置失败',
    }, { status: 500 });
  }
}
