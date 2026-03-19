import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getWechatPlatformSettingsCompat, resolveWechatRedirectUri } from '@/lib/wechat-runtime-config';

/**
 * 检查微信配置（调试用）
 * GET /api/debug/wechat-config
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const setting = await getWechatPlatformSettingsCompat();

    const config = {
      // 开放平台配置（PC扫码登录）
      wechatOpenAppId: setting?.wechatOpenAppId || null,
      wechatOpenAppSecret: setting?.wechatOpenAppSecret ? setting.wechatOpenAppSecret.substring(0, 8) + '...' : null,

      // 公众号配置（微信浏览器授权）
      wechatMpAppId: setting?.wechatMpAppId || null,
      wechatMpAppSecret: setting?.wechatMpAppSecret ? setting.wechatMpAppSecret.substring(0, 8) + '...' : null,
      resolvedRedirectUri: resolveWechatRedirectUri(request),

      // 环境变量配置（降级用）
      env: {
        WECHAT_OPEN_APPID: process.env.WECHAT_OPEN_APPID || null,
        WECHAT_OPEN_APPSECRET: process.env.WECHAT_OPEN_APPSECRET ? process.env.WECHAT_OPEN_APPSECRET.substring(0, 8) + '...' : null,
        WECHAT_MP_APPID: process.env.WECHAT_MP_APPID || null,
        WECHAT_MP_SECRET: process.env.WECHAT_MP_SECRET ? process.env.WECHAT_MP_SECRET.substring(0, 8) + '...' : null,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || null,
        INTERNAL_API_URL: process.env.INTERNAL_API_URL || null,
        WECHAT_REDIRECT_URI: process.env.WECHAT_REDIRECT_URI || null,
      }
    };

    return NextResponse.json({
      success: true,
      config
    });
  } catch (error: any) {
    console.error('检查微信配置失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
