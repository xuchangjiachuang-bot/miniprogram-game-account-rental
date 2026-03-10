/**
 * 微信登录服务
 * 支持微信扫码登录
 */

import { generateToken, findOrCreateWechatUser } from './auth-server';

// ==================== 类型定义 ====================

export interface WechatUserInfo {
  openid: string;
  unionid?: string;
  nickname: string;
  headimgurl: string;
  sex: number;
  language: string;
  city: string;
  province: string;
  country: string;
}

export interface WechatLoginResult {
  success: boolean;
  token?: string;
  userId?: string;
  user?: {
    id: string;
    username: string;
    nickname: string;
    avatar: string;
  };
  error?: string;
}

// ==================== 配置 ====================

const WECHAT_APP_ID = process.env.WECHAT_OA_APP_ID;
const WECHAT_APP_SECRET = process.env.WECHAT_OA_APP_SECRET;

// 小程序配置
const MINIPROGRAM_APP_ID = process.env.WECHAT_MINIPROGRAM_APP_ID || 'wx2382e1949d031ba6';
const MINIPROGRAM_APP_SECRET = process.env.WECHAT_MINIPROGRAM_APP_SECRET;

const WECHAT_REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/wechat/callback`
  : 'http://localhost:5000/api/auth/wechat/callback';

// ==================== 微信登录实现 ====================

/**
 * 生成微信登录授权URL
 * 支持两种模式：
 * 1. 开放平台二维码登录（snsapi_login）- 用于在PC端显示二维码
 * 2. 公众号授权登录（snsapi_userinfo）- 用于在微信内打开
 */
export function getWechatAuthUrl(): string {
  if (!WECHAT_APP_ID) {
    throw new Error('微信APPID未配置');
  }

  const encodedRedirectUri = encodeURIComponent(WECHAT_REDIRECT_URI);
  
  // 使用开放平台二维码登录（snsapi_login）
  // 这种方式会在页面上显示二维码，用户扫码后直接授权
  const scope = 'snsapi_login';
  
  return `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_APP_ID}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}#wechat_redirect`;
}

/**
 * 通过授权码获取access_token
 */
export async function getWechatAccessToken(code: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
} | null> {
  try {
    if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
      throw new Error('微信配置未完整');
    }

    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode) {
      throw new Error(data.errmsg);
    }

    return data;
  } catch (error) {
    console.error('获取微信access_token失败:', error);
    return null;
  }
}

/**
 * 通过access_token获取用户信息
 */
export async function getWechatUserInfo(
  access_token: string,
  openid: string
): Promise<WechatUserInfo | null> {
  try {
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode) {
      throw new Error(data.errmsg);
    }

    return data;
  } catch (error) {
    console.error('获取微信用户信息失败:', error);
    return null;
  }
}

/**
 * 微信登录流程
 * 1. 通过授权码获取access_token
 * 2. 通过access_token获取用户信息
 * 3. 查找或创建用户
 * 4. 生成登录token
 */
export async function wechatLogin(code: string): Promise<WechatLoginResult> {
  try {
    // 1. 获取access_token
    const tokenData = await getWechatAccessToken(code);
    if (!tokenData) {
      throw new Error('获取微信授权失败');
    }

    // 2. 获取用户信息
    const wechatUser = await getWechatUserInfo(tokenData.access_token, tokenData.openid);
    if (!wechatUser) {
      throw new Error('获取微信用户信息失败');
    }

    // 3. 查找或创建用户
    const user = await findOrCreateWechatUser({
      openid: wechatUser.openid,
      unionid: wechatUser.unionid,
      nickname: wechatUser.nickname,
      avatar: wechatUser.headimgurl
    });

    if (!user) {
      throw new Error('创建用户失败');
    }

    // 4. 生成登录token
    const authToken = generateToken(user.id, user.userType);

    return {
      success: true,
      token: authToken,
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar || ''
      }
    };
  } catch (error: any) {
    console.error('微信登录失败:', error);
    return {
      success: false,
      error: error.message || '微信登录失败'
    };
  }
}

/**
 * 刷新access_token
 */
export async function refreshWechatToken(refreshToken: string): Promise<boolean> {
  try {
    if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
      return false;
    }

    const url = `https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=${WECHAT_APP_ID}&grant_type=refresh_token&refresh_token=${refreshToken}`;

    const response = await fetch(url);
    const data = await response.json();

    return !data.errcode;
  } catch (error) {
    console.error('刷新微信token失败:', error);
    return false;
  }
}

/**
 * 检查access_token是否有效
 */
export async function checkWechatToken(
  access_token: string,
  openid: string
): Promise<boolean> {
  try {
    const url = `https://api.weixin.qq.com/sns/auth?access_token=${access_token}&openid=${openid}`;

    const response = await fetch(url);
    const data = await response.json();

    return data.errcode === 0;
  } catch (error) {
    console.error('检查微信token失败:', error);
    return false;
  }
}

// ==================== 小程序登录 ====================

/**
 * 小程序登录配置
 */
export interface MiniprogramSessionData {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 小程序code2Session
 * 通过wx.login获取的code换取session_key和openid
 */
export async function code2Session(code: string): Promise<MiniprogramSessionData | null> {
  try {
    const appId = process.env.WECHAT_MINIPROGRAM_APP_ID;
    const appSecret = process.env.WECHAT_MINIPROGRAM_APP_SECRET;

    console.log('[小程序code2session] AppID:', appId);
    console.log('[小程序code2session] AppSecret:', appSecret ? '已配置' : '未配置');

    if (!appId) {
      throw new Error('小程序APPID未配置');
    }

    if (!appSecret) {
      throw new Error('小程序SECRET未配置');
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

    console.log('[小程序code2session] 请求URL:', url.replace(appSecret, '***'));

    const response = await fetch(url);
    const data = await response.json();

    console.log('[小程序code2session] 响应:', data);

    if (data.errcode) {
      throw new Error(`微信授权失败: ${data.errmsg} (errcode: ${data.errcode})`);
    }

    return data;
  } catch (error: any) {
    console.error('[小程序code2session] 失败:', error);
    throw error; // 重新抛出错误，让调用方处理
  }
}

/**
 * 小程序登录
 * 1. 通过code获取openid和session_key
 * 2. 查找或创建用户
 * 3. 生成登录token
 */
export async function miniprogramLogin(code: string): Promise<WechatLoginResult> {
  try {
    console.log('[小程序登录] 开始登录流程，code:', code);

    // 1. 获取openid和session_key
    const sessionData = await code2Session(code);

    if (!sessionData) {
      throw new Error('获取微信授权失败：未返回有效数据');
    }

    if (sessionData.errcode) {
      throw new Error(`微信授权失败: ${sessionData.errmsg} (errcode: ${sessionData.errcode})`);
    }

    console.log('[小程序登录] 获取到openid:', sessionData.openid);

    // 2. 查找或创建用户（使用默认昵称和头像）
    const user = await findOrCreateWechatUser({
      openid: sessionData.openid,
      unionid: sessionData.unionid,
      nickname: '微信用户',
      avatar: ''
    });

    if (!user) {
      throw new Error('创建用户失败');
    }

    console.log('[小程序登录] 用户创建/查找成功，用户ID:', user.id);

    // 3. 生成登录token
    const authToken = generateToken(user.id, user.userType);

    console.log('[小程序登录] Token生成成功');

    return {
      success: true,
      token: authToken,
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar || ''
      }
    };
  } catch (error: any) {
    console.error('小程序登录失败:', error);
    return {
      success: false,
      error: error.message || '小程序登录失败'
    };
  }
}
