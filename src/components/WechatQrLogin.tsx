'use client';

import { useEffect, useMemo, useRef } from 'react';

declare global {
  interface Window {
    WxLogin?: new (options: {
      self_redirect: boolean;
      id: string;
      appid: string;
      scope: string;
      redirect_uri: string;
      state: string;
      style?: string;
      href?: string;
    }) => unknown;
  }
}

interface WechatQrLoginProps {
  appId: string;
  redirectUri: string;
  state?: string;
  width?: number;
  height?: number;
}

const SCRIPT_ID = 'wechat-open-platform-login-sdk';

function loadWechatLoginScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('WINDOW_UNAVAILABLE'));
      return;
    }

    if (window.WxLogin) {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('WECHAT_SDK_LOAD_FAILED')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('WECHAT_SDK_LOAD_FAILED'));
    document.head.appendChild(script);
  });
}

export default function WechatQrLogin({
  appId,
  redirectUri,
  state = 'login',
  width = 300,
  height = 400,
}: WechatQrLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = useMemo(() => `wechat-login-${Math.random().toString(36).slice(2, 10)}`, []);

  useEffect(() => {
    let disposed = false;

    async function renderQr() {
      if (!containerRef.current || !appId || !redirectUri) {
        return;
      }

      containerRef.current.innerHTML = '';

      try {
        await loadWechatLoginScript();

        if (disposed || !window.WxLogin) {
          return;
        }

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
      } catch (error) {
        console.error('微信扫码登录二维码渲染失败:', error);
      }
    }

    void renderQr();

    return () => {
      disposed = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [appId, containerId, redirectUri, state]);

  return <div id={containerId} ref={containerRef} style={{ width, height }} />;
}
