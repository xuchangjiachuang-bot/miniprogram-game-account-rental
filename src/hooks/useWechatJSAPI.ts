import { useEffect, useState } from 'react';

declare global {
  interface Window {
    wx: any;
    WeixinJSBridge?: {
      invoke: (
        method: string,
        params: Record<string, unknown>,
        callback: (result: Record<string, unknown>) => void,
      ) => void;
    };
  }
}

export interface CheckJsApiResult {
  chooseWXPay?: boolean | 'true' | 'false';
  requestMerchantTransfer?: boolean | 'true' | 'false';
  [key: string]: boolean | 'true' | 'false' | undefined;
}

function stringifyWechatSdkError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isWechatBrowser(userAgent: string) {
  return /MicroMessenger/i.test(userAgent);
}

function isDesktopWechatBrowser(userAgent: string) {
  return /WindowsWechat|MacWechat|wxwork/i.test(userAgent)
    || (!/Mobile/i.test(userAgent) && /MicroMessenger/i.test(userAgent));
}

const WECHAT_SDK_READY_TIMEOUT_MS = 8000;

export function useWechatJSAPI() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const isWechat = isWechatBrowser(userAgent);
  const isDesktopWechat = isDesktopWechatBrowser(userAgent);
  const isMobileWechat = isWechat && !isDesktopWechat;

  useEffect(() => {
    if (!isWechat) {
      setError('请在微信内打开');
      return;
    }

    if (isDesktopWechat) {
      setError('当前是桌面微信环境，请改用手机微信');
      return;
    }

    if (typeof window !== 'undefined' && window.wx) {
      setLoaded(true);
      return;
    }

    void loadWechatSDK();
  }, [isDesktopWechat, isWechat]);

  const loadWechatSDK = async () => {
    try {
      setLoading(true);
      setError(null);

      const script = document.createElement('script');
      script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
      script.async = true;
      script.onload = () => {
        setLoaded(true);
        setLoading(false);
      };
      script.onerror = () => {
        setError('微信 SDK 加载失败');
        setLoading(false);
      };

      document.head.appendChild(script);
    } catch (err: any) {
      setError(err.message || '加载失败');
      setLoading(false);
    }
  };

  const configWechatSDK = async (
    appId: string,
    timestamp: number,
    nonceStr: string,
    signature: string,
    jsApiList: string[] = ['chooseWXPay', 'checkJsApi'],
  ) => {
    if (!loaded || !window.wx) {
      throw new Error('微信 SDK 未加载');
    }

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('微信 JS SDK 初始化超时，请检查 JS 接口安全域名和当前访问地址'));
      }, WECHAT_SDK_READY_TIMEOUT_MS);

      window.wx.config({
        debug: false,
        appId,
        timestamp,
        nonceStr,
        signature,
        jsApiList,
      });

      window.wx.ready(() => {
        window.clearTimeout(timeout);
        resolve(true);
      });

      window.wx.error((sdkError: unknown) => {
        window.clearTimeout(timeout);
        reject(new Error(`WECHAT_JSAPI_CONFIG_FAILED: ${stringifyWechatSdkError(sdkError)}`));
      });
    });
  };

  const checkJsApiSupport = async (jsApiList: string[]): Promise<CheckJsApiResult> => {
    if (!loaded || !window.wx) {
      throw new Error('微信 SDK 未加载');
    }

    return new Promise((resolve, reject) => {
      window.wx.checkJsApi({
        jsApiList,
        success: (result: { checkResult?: CheckJsApiResult }) => {
          resolve(result?.checkResult || {});
        },
        fail: (sdkError: unknown) => {
          reject(new Error(`WECHAT_JSAPI_CHECK_API_FAILED: ${stringifyWechatSdkError(sdkError)}`));
        },
      });
    });
  };

  const checkPaymentPermission = async () => {
    return checkJsApiSupport(['chooseWXPay']);
  };

  const requestMerchantTransfer = async (params: {
    mchId: string;
    appId: string;
    packageInfo: string;
  }) => {
    if (typeof window === 'undefined') {
      throw new Error('当前环境不支持微信收款确认');
    }

    const getBridge = async () => {
      if (window.WeixinJSBridge?.invoke) {
        return window.WeixinJSBridge;
      }

      return new Promise<typeof window.WeixinJSBridge>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          document.removeEventListener('WeixinJSBridgeReady', handleReady);
          reject(new Error('微信收款确认能力未就绪，请在手机微信内打开后重试'));
        }, 5000);

        const handleReady = () => {
          window.clearTimeout(timer);
          document.removeEventListener('WeixinJSBridgeReady', handleReady);
          resolve(window.WeixinJSBridge);
        };

        document.addEventListener('WeixinJSBridgeReady', handleReady);
      });
    };

    const bridge = await getBridge();
    if (!bridge?.invoke) {
      throw new Error('微信收款确认能力未就绪，请在手机微信内打开后重试');
    }

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      bridge.invoke(
        'requestMerchantTransfer',
        {
          mchId: params.mchId,
          appId: params.appId,
          package: params.packageInfo,
        },
        (result: Record<string, unknown>) => {
          const errMsg = String(result.err_msg || result.errMsg || '');

          if (errMsg === 'requestMerchantTransfer:ok') {
            resolve(result);
            return;
          }

          if (errMsg.includes(':cancel')) {
            reject(new Error('你已取消收款确认'));
            return;
          }

          reject(new Error(errMsg || '拉起微信提现确认失败'));
        },
      );
    });
  };

  return {
    loaded,
    loading,
    error,
    isWechat,
    isDesktopWechat,
    isMobileWechat,
    configWechatSDK,
    checkJsApiSupport,
    checkPaymentPermission,
    requestMerchantTransfer,
  };
}
