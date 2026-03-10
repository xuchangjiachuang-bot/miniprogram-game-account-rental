import { NextRequest, NextResponse } from 'next/server';
import { db, admins, platformSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * 更新微信服务器配置
 * POST /api/admin/wechat/update-server-config
 *
 * 请求体：
 * - wechatToken: 令牌
 * - wechatEncodingAESKey: 消息加解密密钥
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限 - 从Cookie中获取admin_token
    const cookieHeader = request.headers.get('cookie');
    const adminToken = cookieHeader
      ?.split('; ')
      ?.find(row => row.startsWith('admin_token='))
      ?.split('=')[1];

    if (!adminToken) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const adminList = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminToken))
      .limit(1);

    if (adminList.length === 0) {
      return NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 });
    }

    const admin = adminList[0];

    if (admin.status !== 'active') {
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 });
    }

    // 只有超级管理员可以修改配置
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { wechatToken, wechatEncodingAESKey } = body;

    // 验证参数
    if (wechatToken && (wechatToken.length < 3 || wechatToken.length > 32)) {
      return NextResponse.json(
        { success: false, error: 'Token 长度必须在3-32字符之间' },
        { status: 400 }
      );
    }

    if (wechatEncodingAESKey && wechatEncodingAESKey.length !== 43) {
      return NextResponse.json(
        { success: false, error: 'EncodingAESKey 长度必须为43字符' },
        { status: 400 }
      );
    }

    // 获取现有设置
    const [existingSetting] = await db
      .select()
      .from(platformSettings)
      .limit(1);

    if (!existingSetting) {
      return NextResponse.json(
        { success: false, error: '平台设置不存在' },
        { status: 404 }
      );
    }

    // 更新配置
    await db
      .update(platformSettings)
      .set({
        wechatToken: wechatToken || null,
        wechatEncodingAESKey: wechatEncodingAESKey || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(platformSettings.id, existingSetting.id));

    // 同时设置环境变量（用于 GET 请求时读取）
    if (wechatToken) {
      process.env.WECHAT_TOKEN = wechatToken;
    }

    return NextResponse.json({
      success: true,
      message: '配置更新成功',
    });
  } catch (error: any) {
    console.error('更新微信服务器配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新配置失败' },
      { status: 500 }
    );
  }
}
