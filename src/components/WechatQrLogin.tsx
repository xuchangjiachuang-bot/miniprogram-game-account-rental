'use client';

interface WechatQrLoginProps {
  loginUrl: string;
  width?: number;
  height?: number;
}

export default function WechatQrLogin({
  loginUrl,
  width = 320,
  height = 480,
}: WechatQrLoginProps) {
  return (
    <div className="space-y-3">
      <div
        className="mx-auto overflow-hidden rounded-md border border-gray-200 bg-white"
        style={{ width, minHeight: height }}
      >
        <iframe
          title="微信扫码登录"
          src={loginUrl}
          className="block border-0"
          style={{ width: '100%', height }}
        />
      </div>
      <p className="text-center text-sm text-gray-500">请使用微信扫描二维码并在手机上确认登录</p>
    </div>
  );
}
