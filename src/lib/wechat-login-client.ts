'use client';

export const WECHAT_LOGIN_SUCCESS_MESSAGE_TYPE = 'wechat_login_success';

export interface WechatLoginConfigData {
  appId: string;
  redirectUri: string;
  state: string;
}

export interface WechatLoginSuccessMessage {
  type: typeof WECHAT_LOGIN_SUCCESS_MESSAGE_TYPE;
  token?: string | null;
  user?: unknown;
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

interface WechatLoginStateResponse {
  success: boolean;
  loggedIn?: boolean;
  token?: string;
  error?: string;
  message?: string;
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

export function createWechatQrLoginState() {
  return `login_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function resolveLoginReturnTo(returnTo?: string | null) {
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }

  return '/';
}

export function isWechatLoginSuccessMessage(value: unknown): value is WechatLoginSuccessMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const token = candidate.token;

  return (
    candidate.type === WECHAT_LOGIN_SUCCESS_MESSAGE_TYPE &&
    (token === undefined || token === null || typeof token === 'string')
  );
}

export async function fetchWechatLoginConfig(): Promise<WechatLoginConfigData> {
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
    throw new Error('微信登录配置不完整，请稍后再试');
  }

  return {
    appId,
    redirectUri,
    state: createWechatQrLoginState(),
  };
}

export async function checkWechatLoginState(state: string) {
  const response = await fetch(`/api/auth/wechat/check-login?state=${encodeURIComponent(state)}`, {
    cache: 'no-store',
  });
  const result = await readJsonResponse<WechatLoginStateResponse>(
    response,
    '检查微信登录状态失败',
  );

  if (!result.success) {
    throw new Error(result.error || result.message || '检查微信登录状态失败');
  }

  return {
    loggedIn: result.loggedIn === true,
    token: result.token || null,
  };
}
