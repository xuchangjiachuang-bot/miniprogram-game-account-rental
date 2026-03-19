import { NextResponse } from 'next/server';
import { normalizeHomepageConfig } from '@/lib/homepage-config-normalizer';
import { systemConfigManager } from '@/storage/database/systemConfigManager';

export async function GET() {
  try {
    const config = await systemConfigManager.getHomepageConfig();

    return NextResponse.json({
      success: true,
      data: normalizeHomepageConfig(config),
    });
  } catch (error) {
    console.error('[GET /api/homepage-config] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'HOMEPAGE_CONFIG_LOAD_FAILED',
      },
      { status: 500 },
    );
  }
}
