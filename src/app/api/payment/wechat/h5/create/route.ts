import { NextResponse } from 'next/server';

function buildUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'WECHAT_H5_PAYMENT_UNAVAILABLE',
      message: '当前项目的微信 H5 支付资质未通过，外部浏览器支付链路已隔离，请改用微信内 JSAPI 或电脑端 Native 扫码支付。',
    },
    { status: 409 },
  );
}

export async function POST() {
  return buildUnavailableResponse();
}

export async function GET() {
  return buildUnavailableResponse();
}
