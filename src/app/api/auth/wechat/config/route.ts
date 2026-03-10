import { NextRequest, NextResponse } from 'next/server';
import { getWechatOpenConfig } from '@/lib/wechat-oauth';

/**
 * 获取微信登录配置
 * GET /api/auth/wechat/config
 */
export async function GET(request: NextRequest) {
  try {
    const config = await getWechatOpenConfig();
    const redirectUri = config.redirectUri?.trim();
    const requestHost = request.headers.get('host')?.toLowerCase() || '';
    const requestHostname = requestHost.split(':')[0];

    let callbackUrl: URL | null = null;
    if (redirectUri) {
      try {
        callbackUrl = new URL(redirectUri);
      } catch {
        callbackUrl = null;
      }
    }

    const hostname = callbackUrl?.hostname?.toLowerCase() || '';
    const isLocalCallback = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);
    const isHttpsCallback = callbackUrl?.protocol === 'https:';
    const isLocalRequest = ['localhost', '127.0.0.1', '0.0.0.0'].includes(requestHostname);

    console.log('[微信登录配置] 配置结果:', {
      hasAppId: !!config.appId,
      appIdLength: config.appId.length,
      redirectUri,
      requestHost,
      isLocalRequest,
      isLocalCallback,
      isHttpsCallback,
    });

    if (!config.appId || !redirectUri) {
      return NextResponse.json(
        {
          success: false,
          enabled: false,
          error: '当前环境未完成微信登录配置，请先配置开放平台 AppID 和回调地址。',
        }
      );
    }

    if (!callbackUrl || !isHttpsCallback || isLocalCallback) {
      return NextResponse.json(
        {
          success: false,
          enabled: false,
          error: '当前环境未启用微信登录，请使用已配置微信回调域名的 HTTPS 测试地址。',
        }
      );
    }

    if (isLocalRequest) {
      return NextResponse.json(
        {
          success: false,
          enabled: false,
          error: '你当前打开的是本地开发地址，微信登录回调必须走已备案的公网 HTTPS 域名，所以这里先禁用微信登录。',
        }
      );
    }

    return NextResponse.json({
      success: true,
      enabled: true,
      data: {
        appId: config.appId,
        redirectUri,
      },
    });
  } catch (error: any) {
    console.error('获取微信配置失败:', error);

    return NextResponse.json(
      {
        success: false,
        enabled: false,
        error: error.message || '获取微信配置失败',
      },
      { status: 500 }
    );
  }
}
