import { NextRequest, NextResponse } from 'next/server';
import { getWechatOpenConfig } from '@/lib/wechat-oauth';

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

    console.log('[wechat-login-config] resolved', {
      hasAppId: !!config.appId,
      appIdLength: config.appId.length,
      redirectUri,
      requestHost,
      isLocalRequest,
      isLocalCallback,
      isHttpsCallback,
    });

    if (!config.appId || !redirectUri) {
      return NextResponse.json({
        success: false,
        enabled: false,
        error: '当前环境未完成微信登录配置，请先配置开放平台 AppID 和回调地址。',
      });
    }

    if (!callbackUrl || !isHttpsCallback || isLocalCallback) {
      return NextResponse.json({
        success: false,
        enabled: false,
        error: '当前环境未启用微信登录，请使用已配置微信回调域名的 HTTPS 公网地址。',
      });
    }

    if (isLocalRequest) {
      return NextResponse.json({
        success: false,
        enabled: false,
        error: '当前打开的是本地开发地址，微信登录回调必须走已备案的 HTTPS 公网域名，因此这里先禁用微信登录。',
      });
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
    console.error('[wechat-login-config] failed:', error);
    return NextResponse.json(
      {
        success: false,
        enabled: false,
        error: error.message || '获取微信登录配置失败',
      },
      { status: 500 },
    );
  }
}
