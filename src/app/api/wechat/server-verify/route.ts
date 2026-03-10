import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, platformSettings } from '@/lib/db';

/**
 * 微信服务器配置验证接口
 * GET /api/wechat/server-verify
 *
 * 微信开放平台配置消息推送时会调用此接口验证服务器
 *
 * 参数：
 * - signature: 微信加密签名
 * - timestamp: 时间戳
 * - nonce: 随机数
 * - echostr: 随机字符串（需要原样返回）
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const signature = url.searchParams.get('signature');
    const timestamp = url.searchParams.get('timestamp');
    const nonce = url.searchParams.get('nonce');
    const echostr = url.searchParams.get('echostr');

    console.log('[微信服务器验证] 收到验证请求');
    console.log('[微信服务器验证] 完整URL:', url.href);
    console.log('[微信服务器验证] signature:', signature);
    console.log('[微信服务器验证] timestamp:', timestamp);
    console.log('[微信服务器验证] nonce:', nonce);
    console.log('[微信服务器验证] echostr:', echostr);

    // 检查必需参数
    if (!signature || !timestamp || !nonce || !echostr) {
      console.error('[微信服务器验证] 缺少必需参数');
      return NextResponse.json(
        { success: false, error: '缺少必需参数' },
        { status: 400 }
      );
    }

    // 从数据库获取 Token
    let token = process.env.WECHAT_TOKEN;

    try {
      const [setting] = await db.select().from(platformSettings).limit(1);
      if (setting?.wechatToken) {
        token = setting.wechatToken;
      }
    } catch (error) {
      console.error('[微信服务器验证] 从数据库获取Token失败:', error);
    }

    if (!token) {
      console.error('[微信服务器验证] Token 未配置，请设置环境变量 WECHAT_TOKEN 或在数据库中配置');
      return NextResponse.json(
        { success: false, error: 'Token 未配置，请联系管理员配置' },
        { status: 500 }
      );
    }

    // 验证签名
    // 1. 将 token、timestamp、nonce 三个参数进行字典序排序
    const arr = [token, timestamp, nonce].sort();
    // 2. 将三个参数字符串拼接成一个字符串进行 sha1 加密
    const sha1 = crypto.createHash('sha1');
    sha1.update(arr.join(''));
    const calculatedSignature = sha1.digest('hex');

    console.log('[微信服务器验证] Token:', token);
    console.log('[微信服务器验证] 计算的签名:', calculatedSignature);
    console.log('[微信服务器验证] 微信签名:', signature);

    // 3. 加密后的字符串与 signature 对比，相同则验证成功
    if (calculatedSignature === signature) {
      console.log('[微信服务器验证] 验证成功，返回 echostr');
      // 验证成功，返回 echostr（原样返回微信发送的随机字符串）
      return new NextResponse(echostr, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } else {
      console.error('[微信服务器验证] 验证失败，签名不匹配');
      return NextResponse.json(
        { success: false, error: '签名验证失败' },
        { status: 403 }
      );
    }
  } catch (error: any) {
    console.error('[微信服务器验证] 异常:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器异常' },
      { status: 500 }
    );
  }
}

/**
 * 微信服务器消息推送接口
 * POST /api/wechat/server-verify
 *
 * 处理微信推送的消息（如用户扫码事件）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    console.log('[微信服务器推送] 收到消息推送');
    console.log('[微信服务器推送] 消息内容:', body);

    // 解析 XML 消息
    // 这里需要实现 XML 解析和消息处理逻辑
    // 例如：解析用户扫码事件、关注事件等

    // TODO: 实现具体的消息处理逻辑

    // 返回 success 表示消息已接收
    return new NextResponse('success', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('[微信服务器推送] 异常:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器异常' },
      { status: 500 }
    );
  }
}
