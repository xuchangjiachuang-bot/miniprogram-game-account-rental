import { NextRequest, NextResponse } from 'next/server';

function routeDisabled(method: string) {
  return NextResponse.json(
    {
      success: false,
      error: 'LEGACY_PAYMENT_ROUTE_DISABLED',
      message: `旧版 /api/payments ${method} 接口已下线`,
    },
    { status: 410 },
  );
}

export async function GET(_request: NextRequest) {
  return routeDisabled('GET');
}

export async function POST(_request: NextRequest) {
  return routeDisabled('POST');
}

export async function PATCH(_request: NextRequest) {
  return routeDisabled('PATCH');
}
