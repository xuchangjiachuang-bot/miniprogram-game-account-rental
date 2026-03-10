import { NextRequest, NextResponse } from 'next/server';
import { checkWechatPayConfig, getWechatPayConfigStatus } from '@/lib/wechat/config';

/**
 * 获取微信支付配置状态
 * GET /api/payment/wechat/config
 */
export async function GET() {
  const status = await getWechatPayConfigStatus();

  return NextResponse.json({
    success: true,
    data: status,
  });
}

/**
 * 测试微信支付配置
 * POST /api/payment/wechat/config
 */
export async function POST(request: NextRequest) {
  try {
    const check = await checkWechatPayConfig();

    if (!check.valid) {
      return NextResponse.json({
        success: false,
        error: '配置不完整',
        missing: check.missing,
      }, { status: 400 });
    }

    // 测试微信支付 API 连接
    // TODO: 实现实际的连接测试

    return NextResponse.json({
      success: true,
      message: '配置有效',
      data: {
        appId: check.missing.includes('APPID') ? '未配置' : '已配置',
        mchId: check.missing.includes('商户号 (MCH_ID)') ? '未配置' : '已配置',
        apiKey: check.missing.includes('API 密钥 (API_KEY)') ? '未配置' : '已配置',
        notifyUrl: check.missing.includes('回调地址 (NOTIFY_URL)') ? '未配置' : '已配置',
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '测试失败',
    }, { status: 500 });
  }
}
