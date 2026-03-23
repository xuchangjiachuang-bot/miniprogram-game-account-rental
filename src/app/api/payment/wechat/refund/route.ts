import { NextResponse } from 'next/server';

function buildDisabledResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'ORDER_WECHAT_REFUND_DISABLED',
      message: '订单退款已统一改为退回平台余额，不再直接发起微信订单退款',
    },
    { status: 409 },
  );
}

export async function POST() {
  return buildDisabledResponse();
}
