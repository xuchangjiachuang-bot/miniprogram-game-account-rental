import { NextRequest, NextResponse } from 'next/server';
import { createVerificationApplication } from '@/lib/verification-manual-service';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';

const MOBILE_PATTERN = /^1[3-9]\d{9}$/;

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
    const {
      realName,
      phone,
      idCard,
      idCardFrontUrl,
      idCardBackUrl,
      verificationService = 'manual',
    } = body;

    if (!realName || !phone || !idCard || !idCardFrontUrl || !idCardBackUrl) {
      return NextResponse.json(
        { success: false, error: '请填写完整信息并上传身份证照片' },
        { status: 400 },
      );
    }

    if (realName.length < 2 || realName.length > 20) {
      return NextResponse.json({ success: false, error: '姓名格式不正确' }, { status: 400 });
    }

    if (!MOBILE_PATTERN.test(phone)) {
      return NextResponse.json({ success: false, error: '手机号格式不正确' }, { status: 400 });
    }

    if (!/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard)) {
      return NextResponse.json({ success: false, error: '身份证号码格式不正确' }, { status: 400 });
    }

    const result = await createVerificationApplication({
      userId: user.id,
      realName,
      phone,
      idCard,
      idCardFrontUrl,
      idCardBackUrl,
      verificationService,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '实名认证申请已提交，请等待人工审核',
      data: result.data,
    });
  } catch (error: any) {
    console.error('提交实名认证失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '提交实名认证失败' },
      { status: 500 },
    );
  }
}
