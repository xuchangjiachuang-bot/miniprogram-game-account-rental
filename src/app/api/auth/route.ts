import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  logoutUser,
} from '@/lib/user-service';

function getRequestToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return request.cookies.get('auth_token')?.value ?? null;
}

export async function POST() {
  try {
    return NextResponse.json(
      { success: false, error: '当前仅支持微信登录' },
      { status: 405 },
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getRequestToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Token 无效或已过期' }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('[GET /api/auth] failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getRequestToken(request);
    if (token) {
      logoutUser(token);
    }

    const response = NextResponse.json({ success: true, message: '退出登录成功' });
    response.cookies.delete('auth_token');
    return response;
  } catch (error: any) {
    console.error('[DELETE /api/auth] failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
