import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'DEBUG_ROUTE_DISABLED',
      message: '/api/debug/wechat-config 已下线',
    },
    { status: 410 },
  );
}
