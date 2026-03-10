import { NextRequest, NextResponse } from 'next/server';
import { getWechatPayConfig } from '@/lib/wechat/config';
import { generateSign, generateNonceStr } from '@/lib/wechat/utils';

/**
 * 获取微信 JS-SDK 签名
 * GET /api/wechat/jsapi-signature?url=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 获取 URL
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json({
        success: false,
        error: '缺少 url 参数',
      }, { status: 400 });
    }

    // 2. 获取配置
    const config = await getWechatPayConfig();

    // 3. 生成签名参数
    const nonceStr = generateNonceStr();
    const timestamp = Math.floor(Date.now() / 1000);
    const ticket = 'temp_jsapi_ticket'; // TODO: 需要从微信服务器获取 jsapi_ticket

    // 4. 构建签名字符串
    const stringToSign = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;

    // 5. 生成签名
    const signature = require('crypto')
      .createHash('sha1')
      .update(stringToSign, 'utf8')
      .digest('hex');

    // 6. 返回签名参数
    return NextResponse.json({
      success: true,
      data: {
        appId: config.appId,
        timestamp,
        nonceStr,
        signature,
      },
    });

  } catch (error: any) {
    console.error('[WeChat JSAPI] 获取签名失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取签名失败',
    }, { status: 500 });
  }
}
