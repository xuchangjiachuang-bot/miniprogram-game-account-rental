import { useEffect, useState } from 'react';

declare global {
  interface Window {
    wx: any;
  }
}

interface CheckJsApiResult {
  chooseWXPay?: boolean;
}

const WECHAT_SDK_READY_TIMEOUT_MS = 8000;

export function useWechatJSAPI() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);

    if (!isWechat) {
      setError('请在微信中打开');
      return;
    }

    if (typeof window !== 'undefined' && window.wx) {
      setLoaded(true);
      return;
    }

    void loadWechatSDK();
  }, []);

  const loadWechatSDK = async () => {
    try {
      setLoading(true);
      setError(null);

      const script = document.createElement('script');
      script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
      script.async = true;
      script.onload = () => {
        console.log('[WeChat JSAPI] SDK loaded');
        setLoaded(true);
        setLoading(false);
      };
      script.onerror = () => {
        console.error('[WeChat JSAPI] SDK load failed');
        setError('微信 SDK 加载失败');
        setLoading(false);
      };

      document.head.appendChild(script);
    } catch (err: any) {
      console.error('[WeChat JSAPI] load failed:', err);
      setError(err.message || '加载失败');
      setLoading(false);
    }
  };

  const configWechatSDK = async (appId: string, timestamp: number, nonceStr: string, signature: string) => {
    if (!loaded || !window.wx) {
      throw new Error('微信 SDK 未加载');
    }

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(
          new Error(
            '微信 JS SDK 初始化超时，请检查公众号 JS 接口安全域名、支付授权目录，以及当前是否为微信内真实环境',
          ),
        );
      }, WECHAT_SDK_READY_TIMEOUT_MS);

      window.wx.config({
        debug: false,
        appId,
        timestamp,
        nonceStr,
        signature,
        jsApiList: ['chooseWXPay', 'checkJsApi'],
      });

      window.wx.ready(() => {
        window.clearTimeout(timeout);
        console.log('[WeChat JSAPI] config ready');
        resolve(true);
      });

      window.wx.error((res: any) => {
        window.clearTimeout(timeout);
        console.error('[WeChat JSAPI] config failed:', res);
        reject(res);
      });
    });
  };

  const checkPaymentPermission = async (): Promise<CheckJsApiResult> => {
    if (!loaded || !window.wx) {
      throw new Error('微信 SDK 未加载');
    }

    return new Promise((resolve, reject) => {
      window.wx.checkJsApi({
        jsApiList: ['chooseWXPay'],
        success: (result: { checkResult?: CheckJsApiResult }) => {
          resolve(result?.checkResult || {});
        },
        fail: (sdkError: any) => {
          reject(sdkError);
        },
      });
    });
  };

  return {
    loaded,
    loading,
    error,
    isWechat: /MicroMessenger/i.test(navigator.userAgent),
    configWechatSDK,
    checkPaymentPermission,
  };
}
