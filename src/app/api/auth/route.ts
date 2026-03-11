import { NextRequest, NextResponse } from 'next/server';
import {
  sendVerificationCode,
  registerUser,
  loginUser,
  verifyToken,
  logoutUser,
  wechatBindPhone,
  RegisterParams,
  LoginParams,
} from '@/lib/user-service';

function buildAuthResponse(token: string | undefined, payload: Record<string, unknown>) {
  const response = NextResponse.json(payload);

  if (token) {
    response.cookies.set('auth_token', token, {
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });
  }

  return response;
}

function getRequestToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return request.cookies.get('auth_token')?.value ?? null;
}

async function resolveResponseUser(token: string | undefined, fallbackUser: unknown) {
  if (!token) {
    return fallbackUser;
  }

  const resolvedUser = await verifyToken(token);
  return resolvedUser || fallbackUser;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phone, code, username, user_type } = body;

    if (action === 'send-code') {
      if (!phone) {
        return NextResponse.json({ success: false, error: '缺少手机号' }, { status: 400 });
      }

      await sendVerificationCode(phone);
      return NextResponse.json({ success: true, message: '验证码已发送' });
    }

    if (action === 'register') {
      const params: RegisterParams = { phone, code, username, user_type };
      if (!phone || !code) {
        return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
      }

      const result = await registerUser(params);
      if (!result.success) {
        return NextResponse.json({ success: result.success, message: result.message }, { status: 400 });
      }

      return buildAuthResponse(result.token, {
        success: result.success,
        message: result.message,
        user: await resolveResponseUser(result.token, result.user),
        token: result.token,
      });
    }

    if (action === 'login') {
      const params: LoginParams = { phone, code };
      if (!phone || !code) {
        return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
      }

      const result = await loginUser(params);
      if (!result.success) {
        return NextResponse.json({ success: result.success, message: result.message }, { status: 400 });
      }

      return buildAuthResponse(result.token, {
        success: result.success,
        message: result.message,
        user: await resolveResponseUser(result.token, result.user),
        token: result.token,
      });
    }

    if (action === 'wechat-bind-phone') {
      if (!phone || !code || !body.openid) {
        return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
      }

      const result = await wechatBindPhone(phone, code, body.openid, body.nickname, body.avatar);
      if (!result.success) {
        return NextResponse.json({ success: result.success, message: result.message }, { status: 400 });
      }

      return buildAuthResponse(result.token, {
        success: result.success,
        message: result.message,
        user: await resolveResponseUser(result.token, result.user),
        token: result.token,
      });
    }

    return NextResponse.json({ success: false, error: '未知的操作' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: 'Token无效或已过期' }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('[GET /api/auth] 错误:', error);
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
    console.error('[DELETE /api/auth] 错误:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
