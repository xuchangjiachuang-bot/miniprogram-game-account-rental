import type { NextRequest } from 'next/server';
import { sqlClient } from './db';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const DEFAULT_PROD_BASE_URL = 'https://hfb.yugioh.top';

type MaybeRequest = NextRequest | Request | null | undefined;

export interface WechatPlatformSettingsCompat {
  wechatMpAppId: string | null;
  wechatMpAppSecret: string | null;
  wechatOpenAppId: string | null;
  wechatOpenAppSecret: string | null;
}

function normalizeBaseUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (LOCAL_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(request?: MaybeRequest): string | null {
  if (!request) return null;

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return null;

  const hostname = host.split(':')[0].toLowerCase();
  if (LOCAL_HOSTS.has(hostname)) {
    return null;
  }

  const proto =
    request.headers.get('x-forwarded-proto') ||
    (request.url ? new URL(request.url).protocol.replace(':', '') : 'https');

  return `${proto}://${host}`;
}

export function resolveWechatRedirectUri(request?: MaybeRequest): string {
  const explicitRedirect = process.env.WECHAT_REDIRECT_URI?.trim();
  if (explicitRedirect) {
    try {
      const url = new URL(explicitRedirect);
      if (url.protocol === 'https:' && !LOCAL_HOSTS.has(url.hostname.toLowerCase())) {
        return url.toString();
      }
    } catch {
      // Ignore invalid explicit redirect and continue with safer fallbacks.
    }
  }

  const baseUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL) ||
    normalizeBaseUrl(process.env.INTERNAL_API_URL) ||
    getRequestOrigin(request) ||
    DEFAULT_PROD_BASE_URL;

  return `${baseUrl.replace(/\/$/, '')}/api/auth/wechat/callback`;
}

export async function getWechatPlatformSettingsCompat(): Promise<WechatPlatformSettingsCompat | null> {
  try {
    const rows = await sqlClient<WechatPlatformSettingsCompat[]>`
      select
        wechat_mp_app_id as "wechatMpAppId",
        wechat_mp_app_secret as "wechatMpAppSecret",
        wechat_open_app_id as "wechatOpenAppId",
        wechat_open_app_secret as "wechatOpenAppSecret"
      from platform_settings
      limit 1
    `;

    const setting = rows[0];

    if (!setting) {
      return null;
    }

    return {
      wechatMpAppId: setting.wechatMpAppId ?? null,
      wechatMpAppSecret: setting.wechatMpAppSecret ?? null,
      wechatOpenAppId: setting.wechatOpenAppId ?? null,
      wechatOpenAppSecret: setting.wechatOpenAppSecret ?? null,
    };
  } catch (error) {
    console.error('[wechat-runtime-config] Failed to load platform settings compat:', error);
    return null;
  }
}
