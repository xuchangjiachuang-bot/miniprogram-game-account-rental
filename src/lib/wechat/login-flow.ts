import type { NextRequest, NextResponse } from 'next/server';
import { getWechatOpenConfig, generateWechatAuthUrl } from '@/lib/wechat-oauth';
import {
  buildWechatLoginState,
  normalizeWechatReturnTo,
  parseWechatLoginState,
} from '@/lib/wechat/login-shared';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
export { buildWechatLoginState, parseWechatLoginState };
export const normalizeReturnTo = normalizeWechatReturnTo;

export function getRequestHostname(request: NextRequest) {
  return (request.headers.get('host')?.toLowerCase() || '').split(':')[0];
}

export function isLocalHostname(hostname: string) {
  return LOCAL_HOSTS.has(hostname);
}

export function attachWechatReturnToCookie(response: NextResponse, returnTo?: string | null) {
  const safeReturnTo = normalizeReturnTo(returnTo);

  response.cookies.set('wechat_auth_return_to', safeReturnTo, {
    maxAge: 60 * 10,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

export function clearWechatReturnToCookie(response: NextResponse) {
  response.cookies.set('wechat_auth_return_to', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

export function getWechatReturnToFromCookie(request: NextRequest) {
  return normalizeReturnTo(request.cookies.get('wechat_auth_return_to')?.value || '/');
}

export async function getWechatPcLoginConfig() {
  const config = await getWechatOpenConfig();
  const redirectUri = config.redirectUri?.trim() || '';

  if (!config.appId || !redirectUri) {
    throw new Error('WECHAT_OPEN_CONFIG_INCOMPLETE');
  }

  return {
    appId: config.appId,
    redirectUri,
  };
}

export async function createWechatOauthRedirectUrl(state: string) {
  return generateWechatAuthUrl(state);
}
