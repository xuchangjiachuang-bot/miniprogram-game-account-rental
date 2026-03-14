'use client';

import { buildWechatLoginState, normalizeWechatReturnTo } from '@/lib/wechat/login-shared';

export interface WechatLoginConfigData {
  appId: string;
  redirectUri: string;
  state: string;
  loginUrl: string;
}

interface WechatLoginConfigResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    appId?: string;
    redirectUri?: string;
  };
}

interface JsonResponseBase {
  error?: string;
  message?: string;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

async function readJsonResponse<T extends JsonResponseBase>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  let result: T;

  try {
    result = (await response.json()) as T;
  } catch (error) {
    throw new Error(getErrorMessage(error, fallbackMessage));
  }

  if (!response.ok) {
    throw new Error(result.error || result.message || fallbackMessage);
  }

  return result;
}

export const resolveLoginReturnTo = normalizeWechatReturnTo;

export function createWechatOauthState(returnTo: string) {
  return buildWechatLoginState('oauth', returnTo);
}

export function createWechatPcState(returnTo: string) {
  return buildWechatLoginState('pc', returnTo);
}

export async function fetchWechatLoginConfig(returnTo: string): Promise<WechatLoginConfigData> {
  const response = await fetch('/api/auth/wechat/config', {
    cache: 'no-store',
  });

  const result = await readJsonResponse<WechatLoginConfigResponse>(
    response,
    '当前环境暂时无法使用微信登录',
  );

  if (!result.success) {
    throw new Error(result.error || result.message || '当前环境暂时无法使用微信登录');
  }

  const appId = result.data?.appId?.trim();
  const redirectUri = result.data?.redirectUri?.trim();

  if (!appId || !redirectUri) {
    throw new Error('微信登录配置不完整，请稍后重试');
  }

  const state = createWechatPcState(returnTo);
  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'snsapi_login',
    state,
  });

  return {
    appId,
    redirectUri,
    state,
    loginUrl: `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`,
  };
}
