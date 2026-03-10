import { NextRequest, NextResponse } from 'next/server';
import { db, platformSettings } from '@/lib/db';

/**
 * 测试配置优先级
 * GET /api/test/config-priority
 */
export async function GET(request: NextRequest) {
  try {
    const [setting] = await db.select().from(platformSettings).limit(1);

    const configAnalysis = {
      // 数据库配置
      database: {
        hasMpConfig: !!(setting?.wechatMpAppId && setting?.wechatMpAppSecret),
        hasOpenConfig: !!(setting?.wechatOpenAppId && setting?.wechatOpenAppSecret),
        wechatMpAppId: setting?.wechatMpAppId || null,
        wechatMpAppSecret: setting?.wechatMpAppSecret ? setting.wechatMpAppSecret.substring(0, 8) + '...' : null,
        wechatOpenAppId: setting?.wechatOpenAppId || null,
        wechatOpenAppSecret: setting?.wechatOpenAppSecret ? setting.wechatOpenAppSecret.substring(0, 8) + '...' : null,
      },

      // 环境变量配置
      environment: {
        WECHAT_MP_APPID: process.env.WECHAT_MP_APPID || null,
        WECHAT_MP_SECRET: process.env.WECHAT_MP_SECRET ? process.env.WECHAT_MP_SECRET.substring(0, 8) + '...' : null,
        WECHAT_APPID: process.env.WECHAT_APPID || null,
        WECHAT_APPSECRET: process.env.WECHAT_APPSECRET ? process.env.WECHAT_APPSECRET.substring(0, 8) + '...' : null,
      },

      // 配置来源判断
      configSource: {
        mpConfigSource: setting?.wechatMpAppId && setting?.wechatMpAppSecret
          ? 'DATABASE (platform_settings)'
          : 'ENVIRONMENT (WECHAT_MP_APPID/SECRET)',

        openConfigSource: setting?.wechatOpenAppId && setting?.wechatOpenAppSecret
          ? 'DATABASE (platform_settings)'
          : 'ENVIRONMENT (WECHAT_OPEN_APPID/SECRET)',
      },

      // 使用建议
      recommendations: {
        // 如果数据库中没有公众号配置
        ifMpConfigMissingInDatabase: setting?.wechatMpAppId && setting?.wechatMpAppSecret
          ? '✅ 公众号配置已在数据库中配置，将优先使用数据库配置'
          : '⚠️ 数据库中缺少公众号配置，将使用环境变量 WECHAT_MP_APPID 和 WECHAT_MP_SECRET',

        // 如果环境变量和数据库中的值不同
        mismatchWarning: (() => {
          if (!setting?.wechatMpAppId || !setting?.wechatOpenAppId) return null;

          const isSame = setting.wechatMpAppId === setting.wechatOpenAppId;
          return isSame
            ? '⚠️ 公众号AppID和开放平台AppID相同，可能配置有误'
            : '✅ 公众号AppID和开放平台AppID不同，配置正确';
        })(),
      }
    };

    return NextResponse.json({
      success: true,
      data: configAnalysis
    });
  } catch (error: any) {
    console.error('测试配置优先级失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
