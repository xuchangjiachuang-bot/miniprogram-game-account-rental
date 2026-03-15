import { NextRequest, NextResponse } from 'next/server';
import {
  attachWechatReturnToCookie,
  createWechatOauthRedirectUrl,
  getRequestHostname,
  isLocalHostname,
  normalizeReturnTo,
} from '@/lib/wechat/login-flow';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || 'login';
    const returnTo = normalizeReturnTo(searchParams.get('returnTo'));
    const requestHostname = getRequestHostname(request);

    console.log('[wechat-authorize] request received', {
      state,
      returnTo,
      requestHostname,
    });

    if (isLocalHostname(requestHostname)) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set(
        'error',
        '当前是本地开发地址，微信授权回调必须使用已备案的 HTTPS 公网域名，因此这里已禁用本地微信登录。',
      );
      return NextResponse.redirect(redirectUrl);
    }

    const authUrl = await createWechatOauthRedirectUrl(state);
    console.log('[wechat-authorize] redirecting to wechat oauth', {
      state,
      returnTo,
    });

    return attachWechatReturnToCookie(NextResponse.redirect(authUrl), returnTo);
  } catch (error: any) {
    console.error('[wechat-authorize] failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '微信 OAuth 授权失败',
      },
      { status: 500 },
    );
  }
}
