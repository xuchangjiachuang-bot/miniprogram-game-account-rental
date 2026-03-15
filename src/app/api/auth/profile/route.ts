import { NextRequest, NextResponse } from 'next/server';
import { getServerToken } from '@/lib/server-auth';
import { updateUserProfile, verifyToken } from '@/lib/user-service';

export async function PUT(request: NextRequest) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未登录',
      }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '登录状态已失效，请重新登录',
      }, { status: 401 });
    }

    const body = await request.json();
    const updatedUser = await updateUserProfile(user.id, {
      nickname: typeof body?.nickname === 'string' ? body.nickname : undefined,
      phone: typeof body?.phone === 'string' ? body.phone : undefined,
      email: typeof body?.email === 'string' || body?.email === null ? body.email : undefined,
      avatar: typeof body?.avatar === 'string' || body?.avatar === null ? body.avatar : undefined,
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '资料保存失败';

    const statusMap: Record<string, number> = {
      INVALID_NICKNAME: 400,
      INVALID_PHONE: 400,
      INVALID_EMAIL: 400,
      PHONE_ALREADY_USED: 409,
      USER_NOT_FOUND: 404,
    };

    const errorMap: Record<string, string> = {
      INVALID_NICKNAME: '用户名不能为空',
      INVALID_PHONE: '手机号不能为空',
      INVALID_EMAIL: '邮箱格式不正确',
      PHONE_ALREADY_USED: '该手机号已被其他账号使用',
      USER_NOT_FOUND: '用户不存在',
      PROFILE_UPDATE_FAILED: '资料保存失败',
    };

    return NextResponse.json({
      success: false,
      error: errorMap[message] || message,
    }, {
      status: statusMap[message] || 500,
    });
  }
}
