import crypto from 'crypto';
import { getWechatPlatformSettingsCompat, resolveWechatRedirectUri } from './wechat-runtime-config';
import { fetchWechatJson } from './wechat-http';

export interface WechatOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface WechatUserInfo {
  openid: string;
  nickname?: string;
  headimgurl?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
  unionid?: string;
}

export interface WechatAuthResult {
  success: boolean;
  message?: string;
  userInfo?: WechatUserInfo;
}

function isLikelyWechatAppId(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^wx[a-zA-Z0-9]{16}$/.test(value.trim());
}

function isLikelyWechatSecret(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9]{32}$/.test(value.trim());
}

function resolveValidatedWechatConfig(
  primaryAppId: string | null | undefined,
  primarySecret: string | null | undefined,
  fallbackAppId?: string | null,
  fallbackSecret?: string | null
): Pick<WechatOAuthConfig, 'appId' | 'appSecret'> {
  if (isLikelyWechatAppId(primaryAppId) && isLikelyWechatSecret(primarySecret)) {
    return {
      appId: primaryAppId.trim(),
      appSecret: primarySecret.trim(),
    };
  }

  if (isLikelyWechatAppId(fallbackAppId) && isLikelyWechatSecret(fallbackSecret)) {
    return {
      appId: fallbackAppId.trim(),
      appSecret: fallbackSecret.trim(),
    };
  }

  return {
    appId: '',
    appSecret: '',
  };
}

async function getWechatConfig(): Promise<WechatOAuthConfig> {
  try {
    const setting = await getWechatPlatformSettingsCompat();

    if (setting) {
      return {
        appId: isLikelyWechatAppId(setting.wechatMpAppId) ? setting.wechatMpAppId.trim() : '',
        appSecret: isLikelyWechatSecret(setting.wechatMpAppSecret) ? setting.wechatMpAppSecret.trim() : '',
        redirectUri: resolveWechatRedirectUri(),
      };
    }
  } catch (error) {
    console.error('[wechat-oauth] Failed to load MP config from database:', error);
  }

  const fallback = resolveValidatedWechatConfig(
    process.env.WECHAT_MP_APPID,
    process.env.WECHAT_MP_SECRET
  );

  return {
    appId: fallback.appId,
    appSecret: fallback.appSecret,
    redirectUri: resolveWechatRedirectUri(),
  };
}

function assertWechatConfig(config: WechatOAuthConfig, type: 'mp' | 'open') {
  if (!config.appId) {
    throw new Error(type === 'mp' ? 'WECHAT_MP_APPID_MISSING' : 'WECHAT_OPEN_APPID_MISSING');
  }

  if (!config.appSecret) {
    throw new Error(type === 'mp' ? 'WECHAT_MP_SECRET_MISSING' : 'WECHAT_OPEN_SECRET_MISSING');
  }

  if (!config.redirectUri) {
    throw new Error('WECHAT_REDIRECT_URI_MISSING');
  }
}

export async function getWechatOpenConfig(): Promise<WechatOAuthConfig> {
  try {
    const setting = await getWechatPlatformSettingsCompat();

    if (setting) {
      return {
        appId: isLikelyWechatAppId(setting.wechatOpenAppId) ? setting.wechatOpenAppId.trim() : '',
        appSecret: isLikelyWechatSecret(setting.wechatOpenAppSecret) ? setting.wechatOpenAppSecret.trim() : '',
        redirectUri: resolveWechatRedirectUri(),
      };
    }
  } catch (error) {
    console.error('[wechat-oauth] Failed to load open config from database:', error);
  }

  const envConfig = resolveValidatedWechatConfig(
    process.env.WECHAT_OPEN_APPID,
    process.env.WECHAT_OPEN_APPSECRET
  );

  return {
    appId: envConfig.appId,
    appSecret: envConfig.appSecret,
    redirectUri: resolveWechatRedirectUri(),
  };
}

export async function generateWechatAuthUrl(state: string = 'login'): Promise<string> {
  const config = await getWechatConfig();
  assertWechatConfig(config, 'mp');

  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'snsapi_userinfo',
    state,
  });

  return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
}

export async function generateWechatQrLoginUrl(state: string = 'login'): Promise<string> {
  const config = await getWechatOpenConfig();
  assertWechatConfig(config, 'open');

  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'snsapi_login',
    state,
  });

  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
}

async function getAccessToken(
  code: string
): Promise<{ access_token: string; openid: string; errcode?: number; errmsg?: string }> {
  const config = await getWechatConfig();
  assertWechatConfig(config, 'mp');
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.appId}&secret=${config.appSecret}&code=${code}&grant_type=authorization_code`;

  const response = await fetchWechatJson<{ access_token: string; openid: string; errcode?: number; errmsg?: string }>(url, {
    cache: 'no-store',
  });
  const data = response.data;

  if (data.errcode) {
    throw new Error(data.errmsg);
  }

  return {
    access_token: data.access_token,
    openid: data.openid,
  };
}

async function getOpenAccessToken(
  code: string
): Promise<{ access_token: string; openid: string; unionid: string; errcode?: number; errmsg?: string }> {
  const config = await getWechatOpenConfig();
  assertWechatConfig(config, 'open');

  if (!code) {
    throw new Error('code missing');
  }

  const params = new URLSearchParams({
    appid: config.appId,
    secret: config.appSecret,
    code,
    grant_type: 'authorization_code',
  });

  const response = await fetchWechatJson<{ access_token: string; openid: string; unionid: string; errcode?: number; errmsg?: string }>(`https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`, {
    cache: 'no-store',
  });
  const data = response.data;

  if (data.errcode) {
    throw new Error(data.errmsg);
  }

  return {
    access_token: data.access_token,
    openid: data.openid,
    unionid: data.unionid,
  };
}

async function getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
  const response = await fetchWechatJson<WechatUserInfo & { errcode?: number; errmsg?: string }>(url, {
    cache: 'no-store',
  });
  const data = response.data;

  if (data.errcode) {
    throw new Error(data.errmsg);
  }

  return {
    openid: data.openid,
    nickname: data.nickname,
    headimgurl: data.headimgurl,
    sex: data.sex,
    province: data.province,
    city: data.city,
    country: data.country,
    unionid: data.unionid,
  };
}

export async function wechatLogin(code: string): Promise<WechatAuthResult> {
  try {
    const { access_token, openid } = await getAccessToken(code);
    const userInfo = await getUserInfo(access_token, openid);

    return {
      success: true,
      message: 'Fetched WeChat user info successfully',
      userInfo,
    };
  } catch (error: any) {
    console.error('[wechat-oauth] Official account login failed:', error);
    return {
      success: false,
      message: error.message || 'WeChat login failed',
    };
  }
}

export async function getWechatOpenUserInfo(code: string): Promise<WechatAuthResult> {
  try {
    const { access_token, openid } = await getOpenAccessToken(code);
    const userInfo = await getUserInfo(access_token, openid);

    return {
      success: true,
      message: 'Fetched WeChat open platform user info successfully',
      userInfo,
    };
  } catch (error: any) {
    console.error('[wechat-oauth] Open platform login failed:', error);
    return {
      success: false,
      message: error.message || 'WeChat open platform login failed',
    };
  }
}

export function generateWechatState(prefix = 'login'): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}
