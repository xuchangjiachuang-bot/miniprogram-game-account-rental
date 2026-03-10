import { NextRequest, NextResponse } from 'next/server';
import { db, platformSettings } from '@/lib/db';
import { getWechatOpenConfig } from '@/lib/wechat-oauth';

/**
 * 测试微信配置完整性
 */
export async function GET() {
  try {
    // 从数据库读取配置
    const [setting] = await db.select().from(platformSettings).limit(1);

    // 通过函数获取配置（实际使用的逻辑）
    const config = await getWechatOpenConfig();

    return NextResponse.json({
      success: true,
      database: {
        hasSetting: !!setting,
        hasAppId: !!setting?.wechatOpenAppId,
        hasAppSecret: !!setting?.wechatOpenAppSecret,
        appId: setting?.wechatOpenAppId || null,
        appSecretLength: setting?.wechatOpenAppSecret?.length || 0,
        appSecretPreview: setting?.wechatOpenAppSecret?.substring(0, 8) + '...' || null
      },
      actualConfig: {
        appId: config.appId,
        appSecret: config.appSecret ? config.appSecret.substring(0, 8) + '...' : null,
        appSecretLength: config.appSecret?.length || 0,
        redirectUri: config.redirectUri
      },
      environment: {
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        WECHAT_OPEN_APPID: process.env.WECHAT_OPEN_APPID,
        WECHAT_OPEN_APPSECRET: process.env.WECHAT_OPEN_APPSECRET ? '已配置' : '未配置',
        WECHAT_MP_APPID: process.env.WECHAT_MP_APPID,
        WECHAT_MP_SECRET: process.env.WECHAT_MP_SECRET ? '已配置' : '未配置'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
