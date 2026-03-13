import { NextRequest, NextResponse } from 'next/server';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
export async function GET(request: NextRequest) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未提供认证 token',
      }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '登录状态已失效，请重新登录',
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        userNo: user.user_no,
        username: user.username,
        nickname: user.username,
        avatar: user.avatar,
        userType: user.user_type,
        phone: user.phone,
        email: user.email,
        wechatOpenid: user.wechat_openid || null,
        verified: user.isRealNameVerified,
        realName: user.realName,
        verifiedAt: user.isRealNameVerified ? user.updated_at : null,
      },
    });
  } catch (error: any) {
    console.error('获取当前用户信息失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取当前用户信息失败',
    }, { status: 500 });
  }
}
