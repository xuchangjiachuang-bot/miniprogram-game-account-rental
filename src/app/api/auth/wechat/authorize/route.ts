import { NextRequest, NextResponse } from 'next/server';
import { generateWechatAuthUrl } from '@/lib/wechat-oauth';

/**
 * 微信 OAuth 授权入口
 * GET /api/auth/wechat/authorize?state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || 'login';
    const requestHost = request.headers.get('host')?.toLowerCase() || '';
    const requestHostname = requestHost.split(':')[0];

    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(requestHostname)) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set(
        'error',
        '当前是本地开发地址，微信授权回调会跳到已备案公网 HTTPS 域名，所以这里已禁用本地微信登录。'
      );
      return NextResponse.redirect(redirectUrl);
    }

    const authUrl = await generateWechatAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('微信 OAuth 授权失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '微信 OAuth 授权失败',
      },
      { status: 500 }
    );
  }
}
