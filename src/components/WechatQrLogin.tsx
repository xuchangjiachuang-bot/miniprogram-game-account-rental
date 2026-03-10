'use client';

import { useEffect, useRef } from 'react';

interface WechatQrLoginProps {
  appId: string;
  redirectUri: string;
  state?: string;
  width?: number;
  height?: number;
}

/**
 * 微信扫码登录组件 - 使用微信官方 WxLogin SDK
 */
export default function WechatQrLogin({
  appId,
  redirectUri,
  state = 'login',
  width = 300,
  height = 300
}: WechatQrLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !appId) return;

    // 清空容器
    containerRef.current.innerHTML = '';

    // 创建 WxLogin 实例
    // @ts-ignore - 微信 SDK 的全局对象
    if (typeof window !== 'undefined' && window.WxLogin) {
      // @ts-ignore
      new window.WxLogin({
        self_redirect: false,
        id: 'wechat-login-container',
        appid: appId,
        scope: 'snsapi_login',
        redirect_uri: redirectUri,
        state: state,
        style: 'black',
        href: ''
      });
    } else {
      // 如果 SDK 未加载，动态加载
      const script = document.createElement('script');
      script.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
      script.onload = () => {
        // @ts-ignore
        if (window.WxLogin && containerRef.current) {
          // @ts-ignore
          new window.WxLogin({
            self_redirect: false,
            id: 'wechat-login-container',
            appid: appId,
            scope: 'snsapi_login',
            redirect_uri: redirectUri,
            state: state,
            style: 'black',
            href: ''
          });
        }
      };
      document.head.appendChild(script);
    }
  }, [appId, redirectUri, state]);

  return (
    <div 
      id="wechat-login-container"
      ref={containerRef}
      style={{ width, height }}
    />
  );
}
