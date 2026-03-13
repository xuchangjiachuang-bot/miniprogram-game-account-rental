'use client';

import { useMemo } from 'react';
import QRCode from 'react-qr-code';

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
  const loginUrl = useMemo(() => {
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
    <div className="space-y-3">
      <div
        className="mx-auto flex items-center justify-center overflow-hidden rounded-md bg-white p-4"
        style={{ width, minHeight: height }}
      >
        <div className="space-y-4 text-center">
          <QRCode value={loginUrl} size={Math.min(width - 32, 240)} />
          <p className="text-sm text-gray-500">请使用微信扫一扫完成登录</p>
        </div>
      </div>
    </div>
  );
}
