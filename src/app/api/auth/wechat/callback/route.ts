import { NextRequest, NextResponse } from 'next/server';
import { getWechatOpenUserInfo, type WechatUserInfo, wechatLogin } from '@/lib/wechat-oauth';
import { wechatLogin as wechatUserLogin } from '@/lib/user-service';
import { saveLoginState } from '@/lib/wechat-login-store';

const WECHAT_LOGIN_SUCCESS_MESSAGE_TYPE = 'wechat_login_success';

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function isWechatQrLoginState(state: string | null) {
  return typeof state === 'string' && /^login_\d+_[a-z0-9]+$/i.test(state);
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

function renderQrLoginResultPage(token: string, user: unknown, targetOrigin: string) {
  const safeToken = JSON.stringify(token);
  const safeUser = JSON.stringify(JSON.stringify(user));
  const safeTargetOrigin = JSON.stringify(targetOrigin);

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>登录成功</title>
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
    .icon {
      font-size: 54px;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0 0 10px;
      color: #111827;
      font-size: 26px;
    }
    p {
      margin: 0;
      color: #6b7280;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>登录成功</h1>
    <p>请返回电脑页面，系统会自动完成登录。</p>
  </div>
  <script>
    (function () {
      var message = {
        type: '${WECHAT_LOGIN_SUCCESS_MESSAGE_TYPE}',
        token: ${safeToken},
        user: JSON.parse(${safeUser})
      };

      try {
        if (message.token) {
          window.localStorage.removeItem('cached_user');
          window.localStorage.removeItem('user_cache_time');
          window.localStorage.setItem('auth_token', message.token);
        }
      } catch (storageError) {
        console.error('wechat localStorage sync failed', storageError);
      }

      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(message, ${safeTargetOrigin});
        }
        if (window.opener) {
          window.opener.postMessage(message, ${safeTargetOrigin});
          window.close();
          return;
        }
      } catch (error) {
        console.error('wechat postMessage failed', error);
      }
    })();
  </script>
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
  const returnTo = getSafeReturnTo(request);
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

    if (isQrLogin && state) {
      await saveLoginState(state, loginResult.token);
      return attachAuthCookie(
        renderQrLoginResultPage(loginResult.token, loginResult.user, baseUrl),
        loginResult.token,
      );
    }

    const redirectUrl = new URL(returnTo || '/', baseUrl);
    redirectUrl.searchParams.set('token', loginResult.token);
    redirectUrl.searchParams.set('login_success', 'true');
    redirectUrl.searchParams.set('wechat_login', '1');

    return clearWechatReturnToCookie(attachAuthCookie(NextResponse.redirect(redirectUrl), loginResult.token));
  } catch (error: unknown) {
    console.error('[wechat-callback] failed:', error);
    const errorUrl = new URL('/login', baseUrl);
    errorUrl.searchParams.set('error', 'wechat_auth_failed');
    errorUrl.searchParams.set('reason', encodeURIComponent(getErrorMessage(error, '微信登录失败')));
    return NextResponse.redirect(errorUrl);
  }
}
