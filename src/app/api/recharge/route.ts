import { NextRequest, NextResponse } from 'next/server';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';

export async function POST(request: NextRequest) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '请先登录',
        },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '登录状态已失效，请重新登录',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '充值支付功能尚未接入真实支付回调，已禁止直接到账',
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('充值请求处理失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '充值请求处理失败',
      },
      { status: 500 }
    );
  }
}
