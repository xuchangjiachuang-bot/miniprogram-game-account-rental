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
  const appId =
    process.env.WECHAT_MINIPROGRAM_APPID
    || process.env.WECHAT_MP_APPID
    || '';
  const appSecret =
    process.env.WECHAT_MINIPROGRAM_APP_SECRET
    || process.env.WECHAT_MP_APP_SECRET
    || '';

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
    console.error('[auth/miniprogram] login failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '微信小程序登录失败',
      },
      { status: 500 },
    );
  }
}

