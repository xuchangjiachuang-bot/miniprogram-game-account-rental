import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import { getUserById } from '@/lib/user-service';
import { createVerificationApplication } from '@/lib/verification-manual-service';

/**
 * 提交实名认证申请（人工审核）
 * POST /api/verification/initiate
 *
 * 请求体：
 * - realName: 真实姓名
 * - idCard: 身份证号
 * - idCardFrontUrl: 身份证正面照片URL
 * - idCardBackUrl: 身份证反面照片URL
 * - verificationService: 认证服务（manual, aliyun, tencent）
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const body = await request.json();
    const {
      realName,
      idCard,
      idCardFrontUrl,
      idCardBackUrl,
      verificationService = 'manual'
    } = body;

    if (!realName || !idCard || !idCardFrontUrl || !idCardBackUrl) {
      return NextResponse.json(
        { success: false, error: '请填写完整信息并上传身份证照片' },
        { status: 400 }
      );
    }

    // 简单验证姓名和身份证格式
    if (!realName || realName.length < 2 || realName.length > 20) {
      return NextResponse.json(
        { success: false, error: '姓名格式不正确' },
        { status: 400 }
      );
    }

    // 验证身份证格式（18位）
    if (!/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard)) {
      return NextResponse.json(
        { success: false, error: '身份证号码格式不正确' },
        { status: 400 }
      );
    }

    // 创建实名认证申请
    const result = await createVerificationApplication({
      userId: user.id,
      realName,
      idCard,
      idCardFrontUrl,
      idCardBackUrl,
      verificationService
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '实名认证申请已提交，请等待人工审核',
      data: result.data
    });
  } catch (error: any) {
    console.error('提交实名认证失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '提交实名认证失败' },
      { status: 500 }
    );
  }
}
