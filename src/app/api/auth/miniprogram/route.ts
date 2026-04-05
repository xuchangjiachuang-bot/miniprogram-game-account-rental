import { NextRequest, NextResponse } from 'next/server';
import { wechatLogin } from '@/lib/user-service';

type Jscode2SessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

function resolveMiniProgramConfig() {
  const appId = process.env.WECHAT_MINIPROGRAM_APPID || process.env.WECHAT_MP_APPID || '';
  const appSecret = process.env.WECHAT_MINIPROGRAM_APP_SECRET || process.env.WECHAT_MP_APP_SECRET || '';

  return {
    appId: appId.trim(),
    appSecret: appSecret.trim(),
  };
}

async function exchangeCodeForSession(code: string) {
  const { appId, appSecret } = resolveMiniProgramConfig();
  if (!appId || !appSecret) {
    throw new Error('WECHAT_MINIPROGRAM_CONFIG_INCOMPLETE');
  }

  const params = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: 'authorization_code',
  });

  const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`WECHAT_JSCODE2SESSION_HTTP_${response.status}`);
  }

  const data = (await response.json()) as Jscode2SessionResponse;
  if (data.errcode || !data.openid) {
    throw new Error(data.errmsg || 'WECHAT_JSCODE2SESSION_FAILED');
  }

  return data;
}

function normalizeMiniProgramLoginError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || '');

  if (!rawMessage || rawMessage === 'WECHAT_JSCODE2SESSION_FAILED') {
    return {
      status: 500,
      message: '小程序登录失败，微信登录服务暂时不可用，请稍后重试。',
    };
  }

  if (rawMessage === 'WECHAT_MINIPROGRAM_CONFIG_INCOMPLETE') {
    return {
      status: 500,
      message: '小程序登录配置不完整，请检查云托管环境变量 WECHAT_MINIPROGRAM_APPID 和 WECHAT_MINIPROGRAM_APP_SECRET。',
    };
  }

  const invalidIpMatch = rawMessage.match(/invalid ip\s+([0-9.]+)/i);
  if (/not in whitelist/i.test(rawMessage) || invalidIpMatch) {
    const ip = invalidIpMatch?.[1] || '当前服务端出口 IP';
    return {
      status: 500,
      message: `小程序登录失败：服务端 IP 未加入微信白名单。当前服务端出口 IP 为 ${ip}。请到微信公众平台的小程序后台，在“开发管理 -> 开发设置”中将该 IP 加入白名单后再重试。`,
    };
  }

  const httpStatusMatch = rawMessage.match(/^WECHAT_JSCODE2SESSION_HTTP_(\d{3})$/);
  if (httpStatusMatch) {
    return {
      status: 502,
      message: `小程序登录失败：微信登录服务返回 HTTP ${httpStatusMatch[1]}，请稍后重试。`,
    };
  }

  if (/code been used/i.test(rawMessage)) {
    return {
      status: 400,
      message: '小程序登录失败：本次微信登录凭证已失效，请重新发起登录。',
    };
  }

  if (/invalid code/i.test(rawMessage)) {
    return {
      status: 400,
      message: '小程序登录失败：微信登录凭证无效，请重新发起登录。',
    };
  }

  return {
    status: 500,
    message: rawMessage,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body?.code || '').trim();
    const nickname = String(body?.nickname || '').trim();
    const avatar = String(body?.avatar || '').trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少微信登录 code' },
        { status: 400 },
      );
    }

    const session = await exchangeCodeForSession(code);
    const loginResult = await wechatLogin({
      openid: session.openid as string,
      unionid: session.unionid || undefined,
      nickname: nickname || undefined,
      avatar: avatar || undefined,
      source: 'mp',
    });

    if (!loginResult.success || !loginResult.token || !loginResult.user) {
      return NextResponse.json(
        { success: false, error: loginResult.message || '微信小程序登录失败' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      token: loginResult.token,
      user: loginResult.user,
      data: {
        token: loginResult.token,
        user: loginResult.user,
      },
    });
  } catch (error: unknown) {
    const normalized = normalizeMiniProgramLoginError(error);
    console.error('[auth/miniprogram] login failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: normalized.message,
      },
      { status: normalized.status },
    );
  }
}
