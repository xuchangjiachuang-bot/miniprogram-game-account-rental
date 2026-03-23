import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'TEST_ROUTE_DISABLED',
      message: '/api/test/wechat-urls 已下线',
    },
    { status: 410 },
  );
}
