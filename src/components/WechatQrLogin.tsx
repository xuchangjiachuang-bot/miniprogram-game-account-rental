'use client';

import { useMemo } from 'react';

interface WechatQrLoginProps {
  appId: string;
  redirectUri: string;
  state?: string;
  width?: number;
  height?: number;
}

export default function WechatQrLogin({
  appId,
  redirectUri,
  state = 'login',
  width = 300,
  height = 400,
}: WechatQrLoginProps) {
  const qrLoginUrl = useMemo(() => {
    const params = new URLSearchParams({
      appid: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'snsapi_login',
      state,
    });

    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  }, [appId, redirectUri, state]);

  return (
    <iframe
      src={qrLoginUrl}
      title="微信扫码登录"
      width={width}
      height={height}
      className="max-w-full overflow-hidden rounded-md border-0 bg-white"
      style={{ display: 'block', margin: '0 auto' }}
      scrolling="no"
    />
  );
}
