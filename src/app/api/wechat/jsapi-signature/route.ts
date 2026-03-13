import { NextRequest, NextResponse } from 'next/server';
import { getWechatPayV3Config } from '@/lib/wechat/v3';

type JsapiTicketCache = {
  accessToken: string;
  accessTokenExpiresAt: number;
  jsapiTicket: string;
  jsapiTicketExpiresAt: number;
};

const JSAPI_CACHE_KEY = '__wechat_jsapi_ticket_cache__';

function getCache(): JsapiTicketCache {
  const globalCache = globalThis as typeof globalThis & {
    [JSAPI_CACHE_KEY]?: JsapiTicketCache;
  };

  if (!globalCache[JSAPI_CACHE_KEY]) {
    globalCache[JSAPI_CACHE_KEY] = {
      accessToken: '',
      accessTokenExpiresAt: 0,
      jsapiTicket: '',
      jsapiTicketExpiresAt: 0,
    };
  }

  return globalCache[JSAPI_CACHE_KEY] as JsapiTicketCache;
}

function isLikelyWechatAppId(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^wx[a-zA-Z0-9]{16}$/.test(value.trim());
}

function isLikelyWechatSecret(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9]{32}$/.test(value.trim());
}

async function getWechatMpConfig() {
  const config = await getWechatPayV3Config();
  const appId = config.mpAppId?.trim() || '';
  const appSecret = config.mpSecret?.trim() || '';

  if (!isLikelyWechatAppId(appId) || !isLikelyWechatSecret(appSecret)) {
    throw new Error('公众号配置不完整，无法生成 JS-SDK 签名');
  }

  return { appId, appSecret };
}

async function getWechatAccessToken() {
  const cache = getCache();
  const now = Date.now();

  if (cache.accessToken && cache.accessTokenExpiresAt > now) {
    return cache.accessToken;
  }

  const { appId, appSecret } = await getWechatMpConfig();
  const params = new URLSearchParams({
    grant_type: 'client_credential',
    appid: appId,
    secret: appSecret,
  });

  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/token?${params.toString()}`, {
    cache: 'no-store',
  });
  const data = await response.json();

  if (!response.ok || data.errcode || !data.access_token) {
    throw new Error(data.errmsg || '获取微信公众号 access_token 失败');
  }

  cache.accessToken = data.access_token;
  cache.accessTokenExpiresAt = now + Math.max((Number(data.expires_in) || 7200) - 300, 300) * 1000;
  return cache.accessToken;
}

async function getJsapiTicket() {
  const cache = getCache();
  const now = Date.now();

  if (cache.jsapiTicket && cache.jsapiTicketExpiresAt > now) {
    return cache.jsapiTicket;
  }

  const accessToken = await getWechatAccessToken();
  const params = new URLSearchParams({
    access_token: accessToken,
    type: 'jsapi',
  });

  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?${params.toString()}`, {
    cache: 'no-store',
  });
  const data = await response.json();

  if (!response.ok || data.errcode !== 0 || !data.ticket) {
    throw new Error(data.errmsg || '获取 jsapi_ticket 失败');
  }

  cache.jsapiTicket = data.ticket;
  cache.jsapiTicketExpiresAt = now + Math.max((Number(data.expires_in) || 7200) - 300, 300) * 1000;
  return cache.jsapiTicket;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.nextUrl.searchParams.get('url');

    if (!rawUrl) {
      return NextResponse.json({
        success: false,
        error: '缺少 url 参数',
      }, { status: 400 });
    }

    const normalizedUrl = rawUrl.split('#')[0];
    const ticket = await getJsapiTicket();
    const { appId } = await getWechatMpConfig();
    const nonceStr = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${normalizedUrl}`;
    const signature = require('crypto')
      .createHash('sha1')
      .update(stringToSign, 'utf8')
      .digest('hex');

    return NextResponse.json({
      success: true,
      data: {
        appId,
        timestamp,
        nonceStr,
        signature,
      },
    });
  } catch (error: any) {
    console.error('[WeChat JSAPI] 获取签名失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取签名失败',
    }, { status: 500 });
  }
}
