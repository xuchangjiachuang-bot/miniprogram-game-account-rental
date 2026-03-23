import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'TEST_ROUTE_DISABLED',
      message: '/api/test/storage-self-check 已下线',
    },
    { status: 410 },
  );
}
