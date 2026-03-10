import { NextRequest, NextResponse } from 'next/server';
import { db, platformSettings } from '@/lib/db';

/**
 * 获取微信配置状态
 * GET /api/wechat/status
 */
export async function GET(request: NextRequest) {
  try {
    // 获取平台设置
    const [setting] = await db
      .select()
      .from(platformSettings)
      .limit(1);

    if (!setting) {
      return NextResponse.json({
        success: false,
        error: '平台设置不存在'
      }, { status: 404 });
    }

    // 检查配置状态
    const mpConfigured = !!(setting.wechatMpAppId && setting.wechatMpAppSecret);
    const openConfigured = !!(setting.wechatOpenAppId && setting.wechatOpenAppSecret);
    const serverConfigured = !!setting.wechatToken;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hfb.yugioh.top';

    return NextResponse.json({
      success: true,
      data: {
        mpConfigured,
        openConfigured,
        serverConfigured,
        redirectUri: `${baseUrl}/api/auth/wechat/callback`,
        serverUrl: `${baseUrl}/api/wechat/server-verify`,
      }
    });
  } catch (error: any) {
    console.error('获取微信配置状态失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取配置状态失败'
    }, { status: 500 });
  }
}
