import { NextRequest, NextResponse } from 'next/server';
import { getServerToken } from '@/lib/server-auth';
import { updateUserProfile, verifyToken } from '@/lib/user-service';

const PHONE_PATTERN = /^1[3-9]\d{9}$/;

export async function POST(request: NextRequest) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '登录状态已失效，请重新登录' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const phone = String(body?.phone || '').trim();

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: '当前版本暂不支持一键解密手机号，请改为手动填写手机号绑定',
        },
        { status: 400 },
      );
    }

    if (!PHONE_PATTERN.test(phone)) {
      return NextResponse.json({ success: false, error: '手机号格式不正确' }, { status: 400 });
    }

    const updated = await updateUserProfile(user.id, { phone });

    return NextResponse.json({
      success: true,
      phone: updated.phone || phone,
      data: {
        user: updated,
      },
    });
  } catch (error: unknown) {
    console.error('[auth/miniprogram/bind-phone] failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '绑定手机号失败',
      },
      { status: 500 },
    );
  }
}

