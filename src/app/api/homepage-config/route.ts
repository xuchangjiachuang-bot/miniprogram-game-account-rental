import { NextResponse } from 'next/server';
import { defaultHomepageConfig } from '@/lib/config-types';
import { normalizeHomepageConfig } from '@/lib/homepage-config-normalizer';
import { systemConfigManager } from '@/storage/database/systemConfigManager';

export async function GET() {
  try {
    const config = await systemConfigManager.getHomepageConfig();
    const safeConfig = config && typeof config === 'object' ? config : null;
    const mergedConfig = {
      ...defaultHomepageConfig,
      ...(safeConfig || {}),
      footerInfo: {
        ...defaultHomepageConfig.footerInfo,
        ...(safeConfig?.footerInfo || {}),
      },
      carousels: Array.isArray(safeConfig?.carousels) ? safeConfig.carousels : defaultHomepageConfig.carousels,
      logos: Array.isArray(safeConfig?.logos) ? safeConfig.logos : defaultHomepageConfig.logos,
      skinOptions: Array.isArray(safeConfig?.skinOptions) ? safeConfig.skinOptions : defaultHomepageConfig.skinOptions,
    };

    return NextResponse.json({
      success: true,
      data: normalizeHomepageConfig(mergedConfig),
    });
  } catch (error) {
    console.error('[GET /api/homepage-config] Failed:', error);
    return NextResponse.json({
      success: false,
      error: 'HOMEPAGE_CONFIG_LOAD_FAILED',
    }, { status: 500 });
  }
}
