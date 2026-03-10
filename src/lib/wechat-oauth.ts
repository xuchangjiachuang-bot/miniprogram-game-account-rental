import crypto from 'crypto';
import { getWechatPlatformSettingsCompat, resolveWechatRedirectUri } from './wechat-runtime-config';

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

    if (isLikelyWechatAppId(setting?.wechatMpAppId) && isLikelyWechatSecret(setting?.wechatMpAppSecret)) {
      return {
        appId: setting.wechatMpAppId.trim(),
        appSecret: setting.wechatMpAppSecret.trim(),
        redirectUri: resolveWechatRedirectUri(),
      };
    }
  } catch (error) {
    console.error('[wechat-oauth] Failed to load MP config from database:', error);
  }

  const fallback = resolveValidatedWechatConfig(
    process.env.WECHAT_MP_APPID,
    process.env.WECHAT_MP_SECRET,
    process.env.WECHAT_APPID,
    process.env.WECHAT_APPSECRET
  );

  return {
    appId: fallback.appId,
    appSecret: fallback.appSecret,
    redirectUri: resolveWechatRedirectUri(),
  };
}

export async function getWechatOpenConfig(): Promise<WechatOAuthConfig> {
  try {
    const setting = await getWechatPlatformSettingsCompat();

    if (
      isLikelyWechatAppId(setting?.wechatOpenAppId) &&
      isLikelyWechatSecret(setting?.wechatOpenAppSecret)
    ) {
      return {
        appId: setting.wechatOpenAppId.trim(),
        appSecret: setting.wechatOpenAppSecret.trim(),
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
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.appId}&secret=${config.appSecret}&code=${code}&grant_type=authorization_code`;

  const response = await fetch(url);
  const data = await response.json();

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

  if (!config.appId) {
    throw new Error('appid missing');
  }

  if (!config.appSecret) {
    throw new Error('appsecret missing');
  }

  if (!code) {
    throw new Error('code missing');
  }

  const params = new URLSearchParams({
    appid: config.appId,
    secret: config.appSecret,
    code,
    grant_type: 'authorization_code',
  });

  const response = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`);
  const data = await response.json();

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
  const response = await fetch(url);
  const data = await response.json();

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
