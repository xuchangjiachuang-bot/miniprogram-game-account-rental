import { NextRequest, NextResponse } from 'next/server';
import { sendSms, storeVerifyCode, getSmsConfig } from '@/lib/sms-service';
import { ensureSmsConfigsInitialized } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

function isPublicSmsSendEnabled() {
  return process.env.SMS_SEND_PUBLIC_ENABLED === 'true';
}

/**
 * 发送短信
 * POST /api/sms/send
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPublicSmsSendEnabled()) {
      const auth = await requireAdmin(request);
      if ('error' in auth) {
        return NextResponse.json({
          success: false,
          error: '短信发送入口当前仅允许后台测试使用',
        }, { status: 403 });
      }
    }

    // 确保短信配置已初始化
    await ensureSmsConfigsInitialized();

    const body = await request.json();

    const {
      provider = 'aliyun', // 默认使用阿里云
      phone,
      code,
      templateCode
    } = body;

    // 验证必填字段
    if (!phone) {
      return NextResponse.json({
        success: false,
        error: '缺少 phone 参数'
      }, { status: 400 });
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({
        success: false,
        error: '手机号格式不正确'
      }, { status: 400 });
    }

    // 检查短信服务商是否启用
    const config = await getSmsConfig(provider);
    if (!config) {
      return NextResponse.json({
        success: false,
        error: '未找到短信服务商配置'
      }, { status: 404 });
    }

    if (!config.enabled) {
      return NextResponse.json({
        success: false,
        error: `${config.name} 未启用，请先在管理后台配置并启用`
      }, { status: 400 });
    }

    // 如果没有提供验证码，生成一个
    const verifyCode = code || generateVerifyCode();

    // 发送短信
    const result = await sendSms(provider, {
      phone,
      code: verifyCode,
      templateCode
    });

    if (result.success) {
      // 存储验证码（5分钟有效）
      storeVerifyCode(phone, verifyCode, 5);

      return NextResponse.json({
        success: true,
        message: '短信发送成功',
        data: {
          requestId: result.requestId,
          bizId: result.bizId
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '发送短信失败'
    }, { status: 500 });
  }
}

/**
 * 生成验证码
 */
function generateVerifyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
