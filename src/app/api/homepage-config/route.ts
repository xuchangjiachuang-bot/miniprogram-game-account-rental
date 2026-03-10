import { NextRequest, NextResponse } from 'next/server';
import { systemConfigManager } from '@/storage/database/systemConfigManager';
import { defaultHomepageConfig } from '@/lib/config-types';

/**
 * 获取首页配置（前端）
 * GET /api/homepage-config
 */
export async function GET() {
  try {
    const config = await systemConfigManager.getHomepageConfig();
    
    // 确保配置包含所有必需的字段
    const mergedConfig = {
      ...defaultHomepageConfig,
      ...config,
      footerInfo: {
        ...defaultHomepageConfig.footerInfo,
        ...(config.footerInfo || {})
      },
      carousels: config.carousels || defaultHomepageConfig.carousels,
      logos: config.logos || defaultHomepageConfig.logos,
      skinOptions: config.skinOptions || defaultHomepageConfig.skinOptions
    };
    
    return NextResponse.json({
      success: true,
      data: mergedConfig
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json({
      success: true,
      data: defaultHomepageConfig
    });
  }
}
