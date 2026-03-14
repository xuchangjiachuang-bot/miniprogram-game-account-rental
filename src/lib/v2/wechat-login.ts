import type { NextRequest, NextResponse } from 'next/server';
import { fetchWechatJson } from '@/lib/wechat-http';

export type V2WechatLoginKind = 'pc' | 'oauth';

interface V2WechatConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface V2WechatUserInfo {
  openid: string;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function isWechatAppId(value: string | undefined) {
  return typeof value === 'string' && /^wx[a-zA-Z0-9]{16}$/.test(value.trim());
}

function isWechatSecret(value: string | undefined) {
  return typeof value === 'string' && /^[a-zA-Z0-9]{32}$/.test(value.trim());
}

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
}

function getCallbackPath() {
  return process.env.WECHAT_LOGIN_V2_CALLBACK_PATH || '/api/v2/auth/wechat/callback';
}

function getCallbackUrl() {
  const configured = process.env.WECHAT_LOGIN_V2_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }

  const baseUrl = getBaseUrl();
  return baseUrl ? `${baseUrl}${getCallbackPath()}` : '';
}

function getMpConfig(): V2WechatConfig {
  return {
    appId: process.env.WECHAT_MP_APPID?.trim() || '',
    appSecret: process.env.WECHAT_MP_SECRET?.trim() || '',
    redirectUri: getCallbackUrl(),
  };
}

function getOpenConfig(): V2WechatConfig {
  return {
    appId: process.env.WECHAT_OPEN_APPID?.trim() || '',
    appSecret: process.env.WECHAT_OPEN_APPSECRET?.trim() || '',
    redirectUri: getCallbackUrl(),
  };
}

export function getV2WechatConfig(kind: V2WechatLoginKind) {
  const config = kind === 'pc' ? getOpenConfig() : getMpConfig();

  const issues: string[] = [];
  if (!isWechatAppId(config.appId)) {
    issues.push(kind === 'pc' ? 'WECHAT_OPEN_APPID_INVALID' : 'WECHAT_MP_APPID_INVALID');
  }
  if (!isWechatSecret(config.appSecret)) {
    issues.push(kind === 'pc' ? 'WECHAT_OPEN_APPSECRET_INVALID' : 'WECHAT_MP_SECRET_INVALID');
  }

  let callbackUrl: URL | null = null;
  try {
    callbackUrl = new URL(config.redirectUri);
  } catch {
    callbackUrl = null;
  }

  if (!callbackUrl) {
    issues.push('WECHAT_LOGIN_V2_REDIRECT_URI_INVALID');
  } else {
    if (callbackUrl.protocol !== 'https:') {
      issues.push('WECHAT_LOGIN_V2_REDIRECT_URI_NOT_HTTPS');
    }
    if (LOCAL_HOSTS.has(callbackUrl.hostname)) {
      issues.push('WECHAT_LOGIN_V2_REDIRECT_URI_LOCALHOST');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    config,
  };
}

export function normalizeV2ReturnTo(returnTo?: string | null) {
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }

  return '/';
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const base64 = padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), '=');
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function buildV2WechatState(kind: V2WechatLoginKind, returnTo?: string | null) {
  return `v2_${kind}:${toBase64Url(normalizeV2ReturnTo(returnTo))}`;
}

export function parseV2WechatState(state?: string | null) {
  if (!state) {
    return { kind: null as V2WechatLoginKind | null, returnTo: '/' };
  }

  const [prefix, encoded] = state.split(':', 2);
  const kind = prefix === 'v2_pc' ? 'pc' : prefix === 'v2_oauth' ? 'oauth' : null;
  if (!kind || !encoded) {
    return { kind: null as V2WechatLoginKind | null, returnTo: '/' };
  }

  try {
    const returnTo = fromBase64Url(encoded);
    return {
      kind,
      returnTo: normalizeV2ReturnTo(returnTo),
    };
  } catch {
    return { kind, returnTo: '/' };
  }
}

export function attachV2ReturnToCookie(response: NextResponse, returnTo?: string | null) {
  response.cookies.set('v2_wechat_return_to', normalizeV2ReturnTo(returnTo), {
    maxAge: 60 * 10,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

export function clearV2ReturnToCookie(response: NextResponse) {
  response.cookies.set('v2_wechat_return_to', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

export function getV2ReturnToFromCookie(request: NextRequest) {
  return normalizeV2ReturnTo(request.cookies.get('v2_wechat_return_to')?.value || '/');
}

export function isLocalRequest(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
  return LOCAL_HOSTS.has(host);
}

export function buildV2WechatAuthorizeUrl(kind: V2WechatLoginKind, state: string) {
  const resolved = getV2WechatConfig(kind);
  if (!resolved.valid) {
    throw new Error(resolved.issues.join(','));
  }

  const scope = kind === 'pc' ? 'snsapi_login' : 'snsapi_userinfo';
  const params = new URLSearchParams({
    appid: resolved.config.appId,
    redirect_uri: resolved.config.redirectUri,
    response_type: 'code',
    scope,
    state,
  });

  const base =
    kind === 'pc'
      ? 'https://open.weixin.qq.com/connect/qrconnect'
      : 'https://open.weixin.qq.com/connect/oauth2/authorize';

  return `${base}?${params.toString()}#wechat_redirect`;
}

async function getWechatAccessToken(kind: V2WechatLoginKind, code: string) {
  const resolved = getV2WechatConfig(kind);
  if (!resolved.valid) {
    throw new Error(resolved.issues.join(','));
  }

  const params = new URLSearchParams({
    appid: resolved.config.appId,
    secret: resolved.config.appSecret,
    code,
    grant_type: 'authorization_code',
  });

  const response = await fetchWechatJson<{
    access_token: string;
    openid: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
  }>(`https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`, {
    cache: 'no-store',
  });

  if (response.data.errcode) {
    throw new Error(response.data.errmsg || 'WECHAT_ACCESS_TOKEN_FAILED');
  }

  return response.data;
}

async function getWechatUserInfo(accessToken: string, openid: string) {
  const response = await fetchWechatJson<V2WechatUserInfo & { errcode?: number; errmsg?: string }>(
    `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`,
    { cache: 'no-store' },
  );

  if (response.data.errcode) {
    throw new Error(response.data.errmsg || 'WECHAT_USERINFO_FAILED');
  }

  return response.data;
}

export async function getV2WechatUser(kind: V2WechatLoginKind, code: string) {
  const token = await getWechatAccessToken(kind, code);
  const user = await getWechatUserInfo(token.access_token, token.openid);

  return {
    ...user,
    unionid: user.unionid || token.unionid,
  };
}
