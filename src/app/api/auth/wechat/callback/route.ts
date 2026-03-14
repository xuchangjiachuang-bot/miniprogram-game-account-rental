import { NextRequest, NextResponse } from 'next/server';
import { getWechatOpenUserInfo, type WechatUserInfo, wechatLogin } from '@/lib/wechat-oauth';
import { wechatLogin as wechatUserLogin } from '@/lib/user-service';

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function isWechatQrLoginState(state: string | null) {
  return typeof state === 'string' && state.startsWith('wechat_pc:');
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const withPadding =
    padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), '=');

  return Buffer.from(withPadding, 'base64').toString('utf8');
}

function getReturnToFromState(state: string | null) {
  if (!state) {
    return '';
  }

  let encoded = '';

  if (state.startsWith('wechat_oauth:')) {
    encoded = state.slice('wechat_oauth:'.length).trim();
  } else if (state.startsWith('wechat_pc:')) {
    encoded = state.slice('wechat_pc:'.length).trim();
  }

  if (!encoded) {
    return '';
  }

  try {
    const decoded = decodeBase64Url(encoded);
    return decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : '';
  } catch {
    return '';
  }
}

function attachAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('auth_token', token, {
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

function getSafeReturnTo(request: NextRequest) {
  const returnTo = request.cookies.get('wechat_auth_return_to')?.value || '';
  return returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '';
}

function clearWechatReturnToCookie(response: NextResponse) {
  response.cookies.set('wechat_auth_return_to', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

function getBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
}

function renderPcQrMisusePage() {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>请在电脑上扫码登录</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card {
      width: min(92vw, 420px);
      padding: 32px 28px;
      background: rgba(255, 255, 255, 0.96);
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
      text-align: center;
    }
    h1 {
      margin: 0 0 12px;
      color: #111827;
      font-size: 26px;
    }
    p {
      margin: 0;
      color: #6b7280;
      line-height: 1.7;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>请在电脑上扫码登录</h1>
    <p>这个二维码只用于电脑端登录。请在电脑页面中展示二维码，然后使用手机微信扫码确认。</p>
  </div>
</body>
</html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  );
}

async function resolveWechatUser(code: string, isQrLogin: boolean): Promise<WechatUserInfo> {
  const result = isQrLogin ? await getWechatOpenUserInfo(code) : await wechatLogin(code);

  if (!result.success || !result.userInfo) {
    throw new Error(result.message || '获取微信用户信息失败');
  }

  return result.userInfo;
}

/**
 * 微信 OAuth 回调
 * GET /api/auth/wechat/callback?code=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const returnTo = getSafeReturnTo(request) || getReturnToFromState(state);
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
  const isQrLogin = isWechatQrLoginState(state);

  if (isMobile && !code) {
    return renderPcQrMisusePage();
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl));
  }

  try {
    const wechatUser = await resolveWechatUser(code, isQrLogin);
    const loginResult = await wechatUserLogin({
      openid: wechatUser.openid,
      nickname: wechatUser.nickname,
      avatar: wechatUser.headimgurl,
      unionid: wechatUser.unionid,
      source: isQrLogin ? 'open' : 'mp',
    });

    if (!loginResult.success || !loginResult.token || !loginResult.user) {
      const errorUrl = new URL('/login', baseUrl);
      errorUrl.searchParams.set('error', 'wechat_login_failed');
      if (loginResult.message) {
        errorUrl.searchParams.set('reason', encodeURIComponent(loginResult.message));
      }
      return NextResponse.redirect(errorUrl);
    }

    const redirectUrl = new URL(returnTo || '/', baseUrl);

    return clearWechatReturnToCookie(attachAuthCookie(NextResponse.redirect(redirectUrl), loginResult.token));
  } catch (error: unknown) {
    console.error('[wechat-callback] failed:', error);
    const errorUrl = new URL('/login', baseUrl);
    errorUrl.searchParams.set('error', 'wechat_auth_failed');
    errorUrl.searchParams.set('reason', encodeURIComponent(getErrorMessage(error, '微信登录失败')));
    return NextResponse.redirect(errorUrl);
  }
}
