import { NextRequest, NextResponse } from 'next/server';
import { getWechatAuthUrl, wechatLogin } from '@/lib/wechat-service';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function isLocalRequest(request: NextRequest) {
  const requestHost = request.headers.get('host')?.toLowerCase() || '';
  const requestHostname = requestHost.split(':')[0];
  return LOCAL_HOSTS.has(requestHostname);
}

/**
 * 微信登录入口
 * GET /api/auth/wechat?code=xxx
 * GET /api/auth/wechat
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    try {
      const result = await wechatLogin(code);

      if (!result.success) {
        return NextResponse.redirect(
          `/login?error=${encodeURIComponent(result.error || '微信登录失败')}`
        );
      }

      const response = NextResponse.redirect('/');
      response.cookies.set('auth_token', result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    } catch (error: any) {
      console.error('微信登录失败:', error);
      return NextResponse.redirect(
        `/login?error=${encodeURIComponent(error.message || '微信登录失败')}`
      );
    }
  }

  if (isLocalRequest(request)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set(
      'error',
      '当前是本地开发地址，微信授权回调会跳到已备案公网 HTTPS 域名，所以这里已禁用本地微信登录。'
    );
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const authUrl = getWechatAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '微信配置未设置' },
      { status: 500 }
    );
  }
}

/**
 * 获取微信登录二维码 URL
 * POST /api/auth/wechat/qrcode
 */
export async function POST(request: NextRequest) {
  if (isLocalRequest(request)) {
    return NextResponse.json({
      success: false,
      enabled: false,
      error: '当前是本地开发地址，微信授权回调会跳到已备案公网 HTTPS 域名，所以这里已禁用本地微信登录。',
    });
  }

  try {
    const authUrl = getWechatAuthUrl();
    return NextResponse.json({
      success: true,
      url: authUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取微信登录二维码失败' },
      { status: 500 }
    );
  }
}
