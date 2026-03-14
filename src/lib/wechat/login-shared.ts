export type WechatLoginKind = 'oauth' | 'pc';

function encodeUtf8ToBase64(value: string) {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(unescape(encodeURIComponent(value)));
  }

  return Buffer.from(value, 'utf8').toString('base64');
}

function decodeBase64ToUtf8(value: string) {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return decodeURIComponent(escape(window.atob(value)));
  }

  return Buffer.from(value, 'base64').toString('utf8');
}

export function toBase64Url(value: string) {
  return encodeUtf8ToBase64(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const base64 = padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), '=');
  return decodeBase64ToUtf8(base64);
}

export function normalizeWechatReturnTo(returnTo?: string | null) {
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }

  return '/';
}

export function buildWechatLoginState(kind: 'oauth' | 'pc', returnTo?: string | null) {
  return `wechat_${kind}:${toBase64Url(normalizeWechatReturnTo(returnTo))}`;
}

export function parseWechatLoginState(state?: string | null) {
  let kind: WechatLoginKind | null = null;

  if (!state) {
    return { kind: null, returnTo: '' };
  }

  const [prefix, encoded] = state.split(':', 2);
  kind = prefix === 'wechat_oauth' ? 'oauth' : prefix === 'wechat_pc' ? 'pc' : null;

  if (!kind || !encoded) {
    return { kind: null, returnTo: '' };
  }

  try {
    const decoded = fromBase64Url(encoded);
    return {
      kind,
      returnTo: decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : '',
    };
  } catch {
    return { kind, returnTo: '' };
  }
}
