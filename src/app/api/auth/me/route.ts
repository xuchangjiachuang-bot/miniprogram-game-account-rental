import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import { getUserById } from '@/lib/user-service';

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
export async function GET(request: NextRequest) {
  try {
    // 从请求中获取用户ID
    const userId = getServerUserId(request);

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '未提供认证token'
      }, { status: 401 });
    }

    // 获取用户信息
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
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
        verifiedAt: user.isRealNameVerified ? user.updated_at : null
      }
    });
  } catch (error: any) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取用户信息失败'
    }, { status: 500 });
  }
}
