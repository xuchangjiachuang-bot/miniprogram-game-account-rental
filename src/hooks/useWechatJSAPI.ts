import { useEffect, useState } from 'react';

declare global {
  interface Window {
    wx: any;
  }
}

/**
 * 加载微信 JS-SDK
 */
export function useWechatJSAPI() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 检查是否已经在微信环境中
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);

    if (!isWechat) {
      setError('请在微信中打开');
      return;
    }

    // 检查是否已加载
    if (typeof window !== 'undefined' && window.wx) {
      setLoaded(true);
      return;
    }

    // 加载微信 JS-SDK
    loadWechatSDK();
  }, []);

  const loadWechatSDK = async () => {
    try {
      setLoading(true);
      setError(null);

      // 加载微信 JS-SDK
      const script = document.createElement('script');
      script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
      script.async = true;
      script.onload = () => {
        console.log('[WeChat JSAPI] SDK 加载成功');
        setLoaded(true);
        setLoading(false);
      };
      script.onerror = () => {
        console.error('[WeChat JSAPI] SDK 加载失败');
        setError('微信 SDK 加载失败');
        setLoading(false);
      };

      document.head.appendChild(script);
    } catch (err: any) {
      console.error('[WeChat JSAPI] 加载失败:', err);
      setError(err.message || '加载失败');
      setLoading(false);
    }
  };

  /**
   * 配置微信 JS-SDK
   */
  const configWechatSDK = async (appId: string, timestamp: number, nonceStr: string, signature: string) => {
    if (!loaded || !window.wx) {
      throw new Error('微信 SDK 未加载');
    }

    return new Promise((resolve, reject) => {
      window.wx.config({
        debug: false,
        appId: appId,
        timestamp: timestamp,
        nonceStr: nonceStr,
        signature: signature,
        jsApiList: ['chooseWXPay'],
      });

      window.wx.ready(() => {
        console.log('[WeChat JSAPI] 配置成功');
        resolve(true);
      });

      window.wx.error((res: any) => {
        console.error('[WeChat JSAPI] 配置失败:', res);
        reject(res);
      });
    });
  };

  return {
    loaded,
    loading,
    error,
    isWechat: /MicroMessenger/i.test(navigator.userAgent),
    configWechatSDK,
  };
}
