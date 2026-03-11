import { NextRequest, NextResponse } from 'next/server';
import { db, platformSettings } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const [setting] = await db.select().from(platformSettings).limit(1);

    if (!setting) {
      return NextResponse.json({
        success: false,
        error: 'No platform settings found',
        data: null,
      });
    }

    const checks = {
      wechatMpAppId: {
        configured: !!setting.wechatMpAppId,
        length: setting.wechatMpAppId?.length || 0,
        prefix: setting.wechatMpAppId?.substring(0, 8) || '',
      },
      wechatMpAppSecret: {
        configured: !!setting.wechatMpAppSecret,
        length: setting.wechatMpAppSecret?.length || 0,
        prefix: setting.wechatMpAppSecret?.substring(0, 8) || '',
      },
      wechatOpenAppId: {
        configured: !!setting.wechatOpenAppId,
        length: setting.wechatOpenAppId?.length || 0,
        prefix: setting.wechatOpenAppId?.substring(0, 8) || '',
      },
      wechatOpenAppSecret: {
        configured: !!setting.wechatOpenAppSecret,
        length: setting.wechatOpenAppSecret?.length || 0,
        prefix: setting.wechatOpenAppSecret?.substring(0, 8) || '',
      },
      wechatToken: {
        configured: !!setting.wechatToken,
        length: setting.wechatToken?.length || 0,
        value: setting.wechatToken || '',
      },
      wechatEncodingAESKey: {
        configured: !!setting.wechatEncodingAESKey,
        length: setting.wechatEncodingAESKey?.length || 0,
        prefix: setting.wechatEncodingAESKey?.substring(0, 8) || '',
      },
    };

    const openPlatformConfigured =
      checks.wechatOpenAppId.configured &&
      checks.wechatOpenAppId.length === 18 &&
      checks.wechatOpenAppSecret.configured &&
      checks.wechatOpenAppSecret.length === 32;

    const mpPlatformConfigured =
      checks.wechatMpAppId.configured &&
      checks.wechatMpAppId.length === 18 &&
      checks.wechatMpAppSecret.configured &&
      checks.wechatMpAppSecret.length === 32;

    const serverConfigured =
      checks.wechatToken.configured &&
      checks.wechatToken.length >= 3 &&
      checks.wechatEncodingAESKey.configured &&
      checks.wechatEncodingAESKey.length === 43;

    const environmentConfig = {
      wechatMpAppId: !!process.env.WECHAT_MP_APPID,
      wechatMpAppSecret: !!process.env.WECHAT_MP_SECRET,
      wechatOpenAppId: !!process.env.WECHAT_OPEN_APPID,
      wechatOpenAppSecret: !!process.env.WECHAT_OPEN_APPSECRET,
      wechatToken: !!process.env.WECHAT_TOKEN,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://hfb.yugioh.top',
      redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://hfb.yugioh.top'}/api/auth/wechat/callback`,
    };

    return NextResponse.json({
      success: true,
      data: {
        checks,
        status: {
          openPlatformConfigured,
          mpPlatformConfigured,
          serverConfigured,
          allConfigured: openPlatformConfigured && mpPlatformConfigured && serverConfigured,
        },
        environmentConfig,
        recommendedActions: [],
      },
    });
  } catch (error: any) {
    console.error('Failed to verify WeChat config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify WeChat config' },
      { status: 500 }
    );
  }
}
