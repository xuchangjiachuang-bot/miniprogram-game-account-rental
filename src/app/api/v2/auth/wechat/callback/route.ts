import { NextRequest, NextResponse } from 'next/server';
import { wechatLogin as persistWechatUser } from '@/lib/user-service';
import {
  clearV2ReturnToCookie,
  getV2ReturnToFromCookie,
  getV2WechatUser,
  normalizeV2ReturnTo,
  parseV2WechatState,
  type V2WechatLoginKind,
} from '@/lib/v2/wechat-login';

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

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const parsedState = parseV2WechatState(state);
  const returnTo = getV2ReturnToFromCookie(request) || normalizeV2ReturnTo(parsedState.returnTo);

  console.log('[v2-wechat-callback] request received', {
    hasCode: !!code,
    codeLength: code?.length || 0,
    state,
    kind: parsedState.kind,
    returnTo,
  });

  if (!code || !parsedState.kind) {
    return NextResponse.redirect(new URL('/v2/login?error=missing_code', baseUrl));
  }

  try {
    const loginKind = parsedState.kind as V2WechatLoginKind;
    const wechatUser = await getV2WechatUser(loginKind, code);

    const loginResult = await persistWechatUser({
      openid: wechatUser.openid,
      nickname: wechatUser.nickname,
      avatar: wechatUser.headimgurl,
      unionid: wechatUser.unionid,
      source: loginKind === 'pc' ? 'open' : 'mp',
    });

    if (!loginResult.success || !loginResult.token) {
      throw new Error(loginResult.message || 'V2_PERSIST_WECHAT_LOGIN_FAILED');
    }

    const redirectUrl = new URL(returnTo || '/', baseUrl);
    console.log('[v2-wechat-callback] success', {
      kind: loginKind,
      userId: loginResult.user?.id,
      redirectTo: redirectUrl.toString(),
    });

    return clearV2ReturnToCookie(attachAuthCookie(NextResponse.redirect(redirectUrl), loginResult.token));
  } catch (error: any) {
    console.error('[v2-wechat-callback] failed:', error);
    const errorUrl = new URL('/v2/login', baseUrl);
    errorUrl.searchParams.set('error', error.message || 'V2_WECHAT_LOGIN_FAILED');
    return NextResponse.redirect(errorUrl);
  }
}
