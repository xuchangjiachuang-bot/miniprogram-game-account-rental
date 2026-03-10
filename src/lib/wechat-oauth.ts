import crypto from 'crypto';
import { db, platformSettings } from './db';

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

/**
 * 从数据库获取微信OAuth配置
 */
async function getWechatConfig(): Promise<WechatOAuthConfig> {
  try {
    const [setting] = await db.select().from(platformSettings).limit(1);

    if (setting?.wechatMpAppId && setting?.wechatMpAppSecret) {
      return {
        appId: setting.wechatMpAppId,
        appSecret: setting.wechatMpAppSecret,
        redirectUri: process.env.WECHAT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/api/auth/wechat/callback`
      };
    }
  } catch (error) {
    console.error('从数据库获取微信配置失败:', error);
  }

  // 降级到环境变量
  return {
    appId: process.env.WECHAT_MP_APPID || process.env.WECHAT_APPID || '',
    appSecret: process.env.WECHAT_MP_SECRET || process.env.WECHAT_APPSECRET || '',
    redirectUri: process.env.WECHAT_REDIRECT_URI || 'http://localhost:5000/api/auth/wechat/callback'
  };
}

/**
 * 从数据库获取微信开放平台配置
 */
export async function getWechatOpenConfig(): Promise<{ appId: string; appSecret: string; redirectUri: string }> {
  try {
    const [setting] = await db.select().from(platformSettings).limit(1);

    console.log('[微信开放平台配置] 从数据库读取配置:', {
      hasSetting: !!setting,
      hasAppId: !!setting?.wechatOpenAppId,
      hasAppSecret: !!setting?.wechatOpenAppSecret,
      appIdLength: setting?.wechatOpenAppId?.length || 0,
      appSecretLength: setting?.wechatOpenAppSecret?.length || 0
    });

    if (setting?.wechatOpenAppId && setting?.wechatOpenAppSecret) {
      return {
        appId: setting.wechatOpenAppId,
        appSecret: setting.wechatOpenAppSecret,
        redirectUri: process.env.WECHAT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://hfb.yugioh.top'}/api/auth/wechat/callback`
      };
    }
  } catch (error) {
    console.error('[微信开放平台配置] 从数据库获取配置失败:', error);
  }

  // 降级到环境变量或公众号配置
  const mpConfig = await getWechatConfig();
  console.log('[微信开放平台配置] 使用环境变量或公众号配置:', {
    envAppId: !!process.env.WECHAT_OPEN_APPID,
    envAppSecret: !!process.env.WECHAT_OPEN_APPSECRET,
    mpAppIdLength: mpConfig.appId.length,
    mpAppSecretLength: mpConfig.appSecret.length
  });

  return {
    appId: process.env.WECHAT_OPEN_APPID || mpConfig.appId,
    appSecret: process.env.WECHAT_OPEN_APPSECRET || mpConfig.appSecret,
    redirectUri: mpConfig.redirectUri
  };
}

/**
 * 生成微信OAuth授权URL（微信公众号）
 */
export async function generateWechatAuthUrl(state: string = 'login'): Promise<string> {
  const config = await getWechatConfig();
  const scope = 'snsapi_userinfo'; // 获取用户详细信息

  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: scope,
    state: state
  });

  return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
}

/**
 * 生成微信开放平台扫码登录URL（用于PC浏览器）
 */
export async function generateWechatQrLoginUrl(state: string = 'login'): Promise<string> {
  const config = await getWechatOpenConfig();

  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'snsapi_login', // 扫码登录scope
    state: state
  });

  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
}

/**
 * 通过code获取access_token（公众号）
 */
async function getAccessToken(code: string): Promise<{ access_token: string; openid: string; errcode?: number; errmsg?: string }> {
  const config = await getWechatConfig();
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.appId}&secret=${config.appSecret}&code=${code}&grant_type=authorization_code`;

  console.log('[公众号Token] 📡 请求access_token...');
  console.log('[公众号Token] appId:', config.appId);
  console.log('[公众号Token] appSecret:', config.appSecret ? config.appSecret.substring(0, 8) + '...' : 'null');
  console.log('[公众号Token] redirectUri:', config.redirectUri);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('[公众号Token] 📥 收到响应:', {
      errcode: data.errcode,
      errmsg: data.errmsg,
      hasAccessToken: !!data.access_token,
      hasOpenid: !!data.openid
    });

    if (data.errcode) {
      console.error('[公众号Token] ❌ 获取失败, errcode:', data.errcode, 'errmsg:', data.errmsg);
      throw new Error(data.errmsg);
    }

    return {
      access_token: data.access_token,
      openid: data.openid
    };
  } catch (error: any) {
    console.error('[公众号Token] ❌ 异常:', error.message);
    throw error;
  }
}

/**
 * 通过code获取access_token（开放平台扫码登录）
 */
async function getOpenAccessToken(code: string): Promise<{ access_token: string; openid: string; unionid: string; errcode?: number; errmsg?: string }> {
  const config = await getWechatOpenConfig();

  console.log('[开放平台Token] 📡 请求access_token...');
  console.log('[开放平台Token] appId:', config.appId);
  console.log('[开放平台Token] appSecret:', config.appSecret ? config.appSecret.substring(0, 8) + '...' : 'null');
  console.log('[开放平台Token] redirectUri:', config.redirectUri);
  console.log('[开放平台Token] code:', code ? code.substring(0, 20) + '...' : 'null');

  // 验证必要参数
  if (!config.appId) {
    console.error('[开放平台Token] ❌ appId 为空');
    throw new Error('appid missing');
  }

  if (!config.appSecret) {
    console.error('[开放平台Token] ❌ appSecret 为空');
    throw new Error('appsecret missing');
  }

  if (!code) {
    console.error('[开放平台Token] ❌ code 为空');
    throw new Error('code missing');
  }

  // 使用 URL 编码构建请求
  const params = new URLSearchParams({
    appid: config.appId,
    secret: config.appSecret,
    code: code,
    grant_type: 'authorization_code'
  });

  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`;

  console.log('[开放平台Token] 请求URL:', url.replace(config.appSecret, '***').replace(code, '***'));

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('[开放平台Token] 📥 收到响应:', {
      errcode: data.errcode,
      errmsg: data.errmsg,
      hasAccessToken: !!data.access_token,
      hasOpenid: !!data.openid,
      hasUnionid: !!data.unionid,
      fullResponse: data
    });

    if (data.errcode) {
      console.error('[开放平台Token] ❌ 获取失败, errcode:', data.errcode, 'errmsg:', data.errmsg);
      throw new Error(data.errmsg);
    }

    return {
      access_token: data.access_token,
      openid: data.openid,
      unionid: data.unionid
    };
  } catch (error: any) {
    console.error('[开放平台Token] ❌ 异常:', error.message);
    throw error;
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode) {
      console.error('获取用户信息失败:', data.errmsg);
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
      unionid: data.unionid
    };
  } catch (error: any) {
    console.error('获取用户信息异常:', error);
    throw error;
  }
}

/**
 * 微信登录 - 通过code获取用户信息（公众号）
 */
export async function wechatLogin(code: string): Promise<WechatAuthResult> {
  console.log('[公众号登录] 🔄 开始处理登录请求');
  console.log('[公众号登录] code:', code.substring(0, 20) + '...');

  try {
    // 1. 通过code获取access_token
    console.log('[公众号登录] 📡 步骤1: 获取access_token...');
    const { access_token, openid } = await getAccessToken(code);
    console.log('[公众号登录] ✅ 获取access_token成功, openid:', openid);

    // 2. 通过access_token和openid获取用户信息
    console.log('[公众号登录] 📡 步骤2: 获取用户信息...');
    const userInfo = await getUserInfo(access_token, openid);
    console.log('[公众号登录] ✅ 获取用户信息成功, nickname:', userInfo.nickname);

    return {
      success: true,
      message: '获取微信用户信息成功',
      userInfo
    };
  } catch (error: any) {
    console.error('[公众号登录] ❌ 失败:', error.message);
    console.error('[公众号登录] 错误堆栈:', error.stack);
    return {
      success: false,
      message: error.message || '微信登录失败'
    };
  }
}

/**
 * 微信开放平台扫码登录 - 通过code获取用户信息
 */
export async function getWechatOpenUserInfo(code: string): Promise<WechatAuthResult> {
  console.log('[开放平台登录] 🔄 开始处理登录请求');
  console.log('[开放平台登录] code:', code.substring(0, 20) + '...');

  try {
    // 1. 通过code获取access_token和openid
    console.log('[开放平台登录] 📡 步骤1: 获取access_token...');
    const { access_token, openid, unionid } = await getOpenAccessToken(code);
    console.log('[开放平台登录] ✅ 获取access_token成功, openid:', openid, 'unionid:', unionid);

    // 2. 通过access_token和openid获取用户信息
    console.log('[开放平台登录] 📡 步骤2: 获取用户信息...');
    const userInfo = await getUserInfo(access_token, openid);
    console.log('[开放平台登录] ✅ 获取用户信息成功, nickname:', userInfo.nickname);

    return {
      success: true,
      message: '获取微信开放平台用户信息成功',
      userInfo
    };
  } catch (error: any) {
    console.error('[开放平台登录] ❌ 失败:', error.message);
    console.error('[开放平台登录] 错误堆栈:', error.stack);
    return {
      success: false,
      message: error.message || '微信开放平台登录失败'
    };
  }
}
