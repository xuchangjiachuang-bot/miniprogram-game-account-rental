'use client';

import { useEffect, useId, useState } from 'react';

interface WechatQrLoginProps {
  appId: string;
  redirectUri: string;
  state?: string;
  width?: number;
  height?: number;
}

declare global {
  interface Window {
    WxLogin?: new (options: {
      self_redirect?: boolean;
      id: string;
      appid: string;
      scope: string;
      redirect_uri: string;
      state: string;
      style?: string;
      href?: string;
    }) => unknown;
    __wechatWxLoginScriptPromise?: Promise<void>;
  }
}

function loadWxLoginScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window unavailable'));
  }

  if (window.WxLogin) {
    return Promise.resolve();
  }

  if (window.__wechatWxLoginScriptPromise) {
    return window.__wechatWxLoginScriptPromise;
  }

  window.__wechatWxLoginScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-wechat-wxlogin="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('load wxLogin script failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
    script.async = true;
    script.dataset.wechatWxlogin = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('load wxLogin script failed'));
    document.head.appendChild(script);
  });

  return window.__wechatWxLoginScriptPromise;
}

export default function WechatQrLogin({
  appId,
  redirectUri,
  state = 'login',
  width = 300,
  height = 400,
}: WechatQrLoginProps) {
  const rawId = useId();
  const containerId = `wechat-qr-login-${rawId.replace(/[:]/g, '-')}`;
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const target = document.getElementById(containerId);
    if (target) {
      target.innerHTML = '';
    }

    void loadWxLoginScript()
      .then(() => {
        if (cancelled) {
          return;
        }

        if (!window.WxLogin) {
          throw new Error('wxLogin unavailable');
        }

        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error('wx login container missing');
        }

        container.innerHTML = '';
        setError('');

        new window.WxLogin({
          self_redirect: false,
          id: containerId,
          appid: appId,
          scope: 'snsapi_login',
          redirect_uri: encodeURIComponent(redirectUri),
          state,
          style: 'black',
          href: '',
        });
      })
      .catch((scriptError: unknown) => {
        console.error('[wechat-qr-login] render failed:', scriptError);
        if (!cancelled) {
          setError('微信扫码登录加载失败，请刷新二维码重试');
        }
      });

    return () => {
      cancelled = true;
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [appId, containerId, redirectUri, state]);

  return (
    <div className="space-y-3">
      <div
        id={containerId}
        className="mx-auto overflow-hidden rounded-md bg-white"
        style={{ width, minHeight: height }}
      />
      {error ? <p className="text-center text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
