import { NextResponse } from 'next/server';

function buildDisabledResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'ORDER_WECHAT_PAYMENT_DISABLED',
      message: '订单支付已统一改为余额支付，请先充值余额后再支付订单。',
    },
    { status: 409 },
  );
}

export async function POST() {
  return buildDisabledResponse();
}

export async function GET() {
  return buildDisabledResponse();
}
