import { NextRequest, NextResponse } from 'next/server';
import { getWechatOpenUserInfo, type WechatUserInfo, wechatLogin } from '@/lib/wechat-oauth';
import { wechatLogin as wechatUserLogin } from '@/lib/user-service';
import {
  clearWechatReturnToCookie,
  getWechatReturnToFromCookie,
  parseWechatLoginState,
} from '@/lib/wechat/login-flow';

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
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
  <title>请在电脑端完成扫码登录</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .card { width: min(92vw, 420px); padding: 32px 28px; background: rgba(255, 255, 255, 0.96); border-radius: 20px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2); text-align: center; }
    h1 { margin: 0 0 12px; color: #111827; font-size: 26px; }
    p { margin: 0; color: #6b7280; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="card">
    <h1>请在电脑端完成扫码登录</h1>
    <p>这个二维码仅用于电脑端登录。请在电脑页面展示二维码，再使用手机微信扫码确认。</p>
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

async function resolveWechatUser(code: string, loginKind: 'oauth' | 'pc' | null): Promise<WechatUserInfo> {
  console.log('[wechat-callback] resolving wechat user', {
    loginKind,
    codeLength: code.length,
  });

  const result = loginKind === 'pc' ? await getWechatOpenUserInfo(code) : await wechatLogin(code);

  if (!result.success || !result.userInfo) {
    throw new Error(result.message || '获取微信用户信息失败');
  }

  console.log('[wechat-callback] wechat user resolved', {
    loginKind,
    hasOpenId: !!result.userInfo.openid,
    hasUnionId: !!result.userInfo.unionid,
    nicknameLength: result.userInfo.nickname?.length || 0,
  });

  return result.userInfo;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const parsedState = parseWechatLoginState(state);
  const returnTo = getWechatReturnToFromCookie(request) || parsedState.returnTo;
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);

  console.log('[wechat-callback] request received', {
    url: request.url,
    hasCode: !!code,
    codeLength: code?.length || 0,
    state,
    loginKind: parsedState.kind,
    returnTo,
    isMobile,
  });

  if (isMobile && !code) {
    console.log('[wechat-callback] mobile request without code, rendering misuse page');
    return renderPcQrMisusePage();
  }

  if (!code) {
    console.warn('[wechat-callback] missing code');
    return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl));
  }

  try {
    const wechatUser = await resolveWechatUser(code, parsedState.kind);

    console.log('[wechat-callback] writing user login state', {
      openidPrefix: wechatUser.openid?.slice(0, 8),
      hasUnionId: !!wechatUser.unionid,
      source: parsedState.kind === 'pc' ? 'open' : 'mp',
    });

    const loginResult = await wechatUserLogin({
      openid: wechatUser.openid,
      nickname: wechatUser.nickname,
      avatar: wechatUser.headimgurl,
      unionid: wechatUser.unionid,
      source: parsedState.kind === 'pc' ? 'open' : 'mp',
    });

    console.log('[wechat-callback] local login result', {
      success: loginResult.success,
      hasToken: !!loginResult.token,
      hasUser: !!loginResult.user,
      message: loginResult.message,
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
    console.log('[wechat-callback] login success, redirecting', {
      redirectTo: redirectUrl.toString(),
      userId: loginResult.user.id,
    });

    return clearWechatReturnToCookie(attachAuthCookie(NextResponse.redirect(redirectUrl), loginResult.token));
  } catch (error: unknown) {
    console.error('[wechat-callback] failed:', error);
    const errorUrl = new URL('/login', baseUrl);
    errorUrl.searchParams.set('error', 'wechat_auth_failed');
    errorUrl.searchParams.set('reason', encodeURIComponent(getErrorMessage(error, '微信登录失败')));
    return NextResponse.redirect(errorUrl);
  }
}
