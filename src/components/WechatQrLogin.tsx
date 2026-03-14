'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WechatQrLoginProps {
  appId: string;
  redirectUri: string;
  state?: string;
  width?: number;
  height?: number;
}

declare global {
  interface Window {
    WxLogin?: new (options: Record<string, unknown>) => void;
  }
}

const WX_LOGIN_SCRIPT = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
let wxLoginScriptPromise: Promise<void> | null = null;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function loadWxLoginScript() {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = WX_LOGIN_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('load_wechat_login_sdk_failed'));
    document.body.appendChild(script);
  });
}

function ensureWxLoginScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.WxLogin) {
    return Promise.resolve();
  }

  if (!wxLoginScriptPromise) {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${WX_LOGIN_SCRIPT}"]`);
    if (existingScript && !window.WxLogin) {
      existingScript.remove();
    }

    wxLoginScriptPromise = loadWxLoginScript().catch((error) => {
      wxLoginScriptPromise = null;
      throw error;
    });
  }

  return wxLoginScriptPromise;
}

export default function WechatQrLogin({
  appId,
  redirectUri,
  state = 'login',
  width = 300,
  height = 400,
}: WechatQrLoginProps) {
  const reactId = useId();
  const widgetId = useMemo(() => `wechat-login-${reactId.replace(/[:]/g, '-')}`, [reactId]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const fallbackUrl = useMemo(() => {
    const params = new URLSearchParams({
      appid: appId,
      redirect_uri: encodeURIComponent(redirectUri),
      response_type: 'code',
      scope: 'snsapi_login',
      state,
    });

    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  }, [appId, redirectUri, state]);

  useEffect(() => {
    let cancelled = false;
    const container = document.getElementById(widgetId);
    if (container) {
      container.innerHTML = '';
    }

    ensureWxLoginScript()
      .then(() => {
        if (cancelled) {
          return;
        }

        const WxLogin = window.WxLogin;
        if (!WxLogin) {
          throw new Error('wechat_login_sdk_unavailable');
        }

        new WxLogin({
          self_redirect: false,
          id: widgetId,
          appid: appId,
          scope: 'snsapi_login',
          redirect_uri: encodeURIComponent(redirectUri),
          state,
          style: 'black',
          href: '',
        });

        setLoading(false);
      })
      .catch((renderError: unknown) => {
        if (cancelled) {
          return;
        }

        console.error('[wechat-qr-login] render failed:', renderError);
        setError(getErrorMessage(renderError, 'render_wechat_qr_failed'));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      const nextContainer = document.getElementById(widgetId);
      if (nextContainer) {
        nextContainer.innerHTML = '';
      }
    };
  }, [appId, redirectUri, retryKey, state, widgetId]);

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRetryKey((value) => value + 1);
  };

  return (
    <div className="space-y-3">
      <div className="mx-auto overflow-hidden rounded-md bg-white p-2" style={{ width, minHeight: height }}>
        <div
          id={widgetId}
          className="relative mx-auto min-h-[360px] overflow-hidden rounded-md bg-white"
          style={{ width: Math.max(width - 16, 280) }}
        >
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="space-y-2 text-center text-sm text-red-500">
          <p>微信扫码组件加载失败，请重试。</p>
          <div className="flex items-center justify-center gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={fallbackUrl} target="_blank" rel="noreferrer">
                在新窗口打开登录
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重新加载二维码
            </Button>
          </div>
        </div>
      ) : null}

      <p className="text-center text-sm text-gray-500">请使用微信扫描二维码完成登录</p>
    </div>
  );
}
