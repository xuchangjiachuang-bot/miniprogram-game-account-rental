import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import { getUserById } from '@/lib/user-service';
import { getUserVerificationApplication } from '@/lib/verification-manual-service';

/**
 * 查询实名认证申请状态
 * GET /api/verification/result
 *
 * 查询参数：
 * - service: 认证服务（manual, aliyun, tencent）
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    // 查询用户的实名认证申请
    const application = await getUserVerificationApplication(user.id);

    if (!application) {
      return NextResponse.json({
        success: true,
        passed: false,
        message: '未找到实名认证申请',
        data: null
      });
    }

    // 根据状态返回结果
    return NextResponse.json({
      success: true,
      passed: application.status === 'approved',
      message: application.status === 'approved' ? '认证成功' :
               application.status === 'rejected' ? `认证失败：${application.reviewComment || '审核未通过'}` :
               '认证审核中',
      data: {
        realName: application.realName,
        idCard: application.idCard,
        verifiedAt: application.reviewedAt,
        status: application.status,
        reviewComment: application.reviewComment
      }
    });
  } catch (error: any) {
    console.error('查询实名认证结果失败:', error);
    return NextResponse.json({
      success: false,
      passed: false,
      message: error.message || '查询认证结果失败'
    }, { status: 500 });
  }
}
