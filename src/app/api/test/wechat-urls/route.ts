import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { generateWechatAuthUrl, generateWechatQrLoginUrl } from '@/lib/wechat-oauth';

/**
 * 测试微信授权URL生成
 * GET /api/test/wechat-urls
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    // 测试公众号授权URL（微信浏览器使用）
    const authUrl = await generateWechatAuthUrl('test');

    // 测试开放平台扫码登录URL（PC浏览器使用）
    const qrLoginUrl = await generateWechatQrLoginUrl('test');

    // 提取关键信息用于分析
    const authParams = new URL(authUrl);
    const qrParams = new URL(qrLoginUrl);

    return NextResponse.json({
      success: true,
      data: {
        // 公众号授权URL
        wechatAuthUrl: {
          full: authUrl,
          parsed: {
            appid: authParams.searchParams.get('appid'),
            redirect_uri: decodeURIComponent(authParams.searchParams.get('redirect_uri') || ''),
            scope: authParams.searchParams.get('scope'),
            state: authParams.searchParams.get('state'),
          }
        },
        // 开放平台扫码登录URL
        qrLoginUrl: {
          full: qrLoginUrl,
          parsed: {
            appid: qrParams.searchParams.get('appid'),
            redirect_uri: decodeURIComponent(qrParams.searchParams.get('redirect_uri') || ''),
            scope: qrParams.searchParams.get('scope'),
            state: qrParams.searchParams.get('state'),
          }
        }
      }
    });
  } catch (error: any) {
    console.error('测试微信URL生成失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
