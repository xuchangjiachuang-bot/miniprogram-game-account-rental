import { NextRequest, NextResponse } from 'next/server';
import { sanitizeHomepageConfigForAdmin } from '@/lib/homepage-config-normalizer';
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
      data: sanitizeHomepageConfigForAdmin(config),
    });
  } catch (error) {
    console.error('[GET /api/admin/homepage-config] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取配置失败',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request);
    if (adminAuth.error) {
      return adminAuth.error;
    }

    const incomingConfig = await request.json();
    if (!incomingConfig || typeof incomingConfig !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: '配置格式错误',
        },
        { status: 400 },
      );
    }

    const existingConfig = await systemConfigManager.getHomepageConfig();
    const mergedConfig = {
      ...(existingConfig && typeof existingConfig === 'object' ? existingConfig : {}),
      ...incomingConfig,
      footerInfo: {
        ...((existingConfig as any)?.footerInfo || {}),
        ...((incomingConfig as any)?.footerInfo || {}),
      },
      carousels: Array.isArray((incomingConfig as any)?.carousels)
        ? (incomingConfig as any).carousels
        : (existingConfig as any)?.carousels,
      logos: Array.isArray((incomingConfig as any)?.logos)
        ? (incomingConfig as any).logos
        : (existingConfig as any)?.logos,
      skinOptions: Array.isArray((incomingConfig as any)?.skinOptions)
        && (incomingConfig as any).skinOptions.length > 0
        ? (incomingConfig as any).skinOptions
        : (existingConfig as any)?.skinOptions,
    };

    const sanitizedConfig = sanitizeHomepageConfigForAdmin(mergedConfig);
    await systemConfigManager.saveHomepageConfig(sanitizedConfig);
    await broadcastConfigUpdate('all');

    return NextResponse.json({
      success: true,
      message: '配置保存成功',
      data: sanitizedConfig,
    });
  } catch (error) {
    console.error('[POST /api/admin/homepage-config] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: '保存配置失败',
      },
      { status: 500 },
    );
  }
}
