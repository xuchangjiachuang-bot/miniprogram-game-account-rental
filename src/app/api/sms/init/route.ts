import { NextResponse } from 'next/server';
import { smsConfigManager } from '@/storage/database/smsConfigManager';

/**
 * 初始化短信配置
 * POST /api/sms/init
 */
export async function POST() {
  try {
    await smsConfigManager.initDefaultConfigs();

    return NextResponse.json({
      success: true,
      message: '短信配置初始化成功'
    });
  } catch (error: any) {
    console.error('初始化失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
