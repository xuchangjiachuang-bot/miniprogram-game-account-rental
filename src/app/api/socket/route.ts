import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Socket 聊天服务已下线，请使用订单群聊接口',
    },
    { status: 410 }
  );
}
