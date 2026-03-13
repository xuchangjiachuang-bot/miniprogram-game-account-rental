import { NextRequest, NextResponse } from 'next/server';
import { checkWechatPayConfig, getWechatPayConfigStatus } from '@/lib/wechat/config';
import { getWechatPayV3Config } from '@/lib/wechat/v3';

export const dynamic = 'force-dynamic';

function maskValue(value: string) {
  if (!value) return '';
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 6)}***${value.slice(-2)}`;
}

/**
 * 获取微信支付配置状态
 * GET /api/payment/wechat/config
 */
export async function GET() {
  try {
    const [status, runtimeConfig] = await Promise.all([
      getWechatPayConfigStatus(),
      getWechatPayV3Config(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        diagnostics: {
          runtimeReadAt: new Date().toISOString(),
          mode: 'runtime-env',
          appIdMask: maskValue(runtimeConfig.appid),
          mpAppIdMask: maskValue(runtimeConfig.mpAppId),
          mchIdMask: maskValue(runtimeConfig.mchid),
          notifyUrlMask: runtimeConfig.notifyUrl || '',
          apiV3KeyLength: runtimeConfig.apiV3Key?.length || 0,
          serialNoLength: runtimeConfig.serialNo?.length || 0,
          privateKeyLength: runtimeConfig.privateKey?.length || 0,
          transferSceneIdMask: maskValue(runtimeConfig.transferSceneId),
        },
      },
    });
  } catch (error: any) {
    console.error('[payment/wechat/config] Failed to read config status:', error);

    return NextResponse.json({
      success: true,
      data: {
        configured: false,
        missingFields: [],
        certConfigured: false,
        certMissing: [],
        appId: '',
        mchId: '',
        notifyUrl: '',
        certPath: '',
        keyPath: '',
        error: error.message || 'Failed to read payment config',
      },
    });
  }
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
