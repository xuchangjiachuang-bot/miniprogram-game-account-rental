import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'DEBUG_COOKIES_DISABLED',
      message: '调试 Cookie 接口已下线',
    },
    { status: 410 },
  );
}
