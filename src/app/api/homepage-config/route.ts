import { NextResponse } from 'next/server';
import { defaultHomepageConfig } from '@/lib/config-types';
import { normalizeHomepageConfig } from '@/lib/homepage-config-normalizer';
import { systemConfigManager } from '@/storage/database/systemConfigManager';

export async function GET() {
  try {
    const config = await systemConfigManager.getHomepageConfig();
    const mergedConfig = {
      ...defaultHomepageConfig,
      ...config,
      footerInfo: {
        ...defaultHomepageConfig.footerInfo,
        ...(config?.footerInfo || {}),
      },
      carousels: config?.carousels || defaultHomepageConfig.carousels,
      logos: config?.logos || defaultHomepageConfig.logos,
      skinOptions: config?.skinOptions || defaultHomepageConfig.skinOptions,
    };

    return NextResponse.json({
      success: true,
      data: normalizeHomepageConfig(mergedConfig),
    });
  } catch (error) {
    console.error('[GET /api/homepage-config] Failed:', error);
    return NextResponse.json({
      success: true,
      data: normalizeHomepageConfig(defaultHomepageConfig),
    });
  }
}
