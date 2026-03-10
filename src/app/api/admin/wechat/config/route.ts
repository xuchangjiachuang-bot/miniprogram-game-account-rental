import { NextResponse } from 'next/server';
import { db, admins, platformSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * 获取微信登录配置（包含敏感信息）
 * GET /api/admin/wechat/config
 * 仅管理员可访问
 */
export async function GET(request: Request) {
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

    // 获取平台设置
    const [setting] = await db
      .select()
      .from(platformSettings)
      .limit(1);

    if (!setting) {
      return NextResponse.json({
        success: false,
        error: '平台设置不存在'
      }, { status: 404 });
    }

    // 返回完整的微信登录配置（包含 AppSecret 等敏感信息）
    return NextResponse.json({
      success: true,
      data: {
        wechatMpAppId: setting.wechatMpAppId || '',
        wechatMpAppSecret: setting.wechatMpAppSecret || '',
        wechatOpenAppId: setting.wechatOpenAppId || '',
        wechatOpenAppSecret: setting.wechatOpenAppSecret || '',
        wechatToken: setting.wechatToken || '',
        wechatEncodingAESKey: setting.wechatEncodingAESKey || '',
        redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://hfb.yugioh.top'}/api/auth/wechat/callback`
      }
    });
  } catch (error: any) {
    console.error('获取微信登录配置失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取微信登录配置失败'
    }, { status: 500 });
  }
}
