import { NextRequest, NextResponse } from 'next/server';
import { db, wecomCustomerService } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { resolvePublicFileReference } from '@/lib/storage-public';

/**
 * 获取企业微信客服配置
 * GET /api/customer-service/config
 */
export async function GET() {
  try {
    const configs = await db
      .select()
      .from(wecomCustomerService)
      .limit(1);

    if (configs.length === 0) {
      // 返回默认配置
      return NextResponse.json({
        success: true,
        data: {
          isEnabled: false,
          status: 'offline',
          kfAvatar: '',
          kfQrCode: '',
          kfUrl: '',
          welcomeMessage: '您好！欢迎咨询，请问有什么可以帮到您？',
          offlineMessage: '客服当前不在线，请您留言，我们会尽快回复。',
          busyMessage: '客服当前忙碌中，请稍后再次咨询。',
          autoReply: true,
          showOnHomepage: true,
          showOnOrderPage: true,
          showOnSellerPage: true,
          floatingButtonEnabled: true,
          floatingButtonPosition: 'right',
          floatingButtonColor: '#07C160',
        },
      });
    }

    const config = configs[0];

    // 返回公开配置（不包含敏感信息）
    return NextResponse.json({
      success: true,
        data: {
          isEnabled: config.isEnabled,
          status: config.status,
          kfAvatar: resolvePublicFileReference(config.kfAvatar),
          kfQrCode: resolvePublicFileReference(config.kfQrCode),
          kfUrl: config.kfUrl,
          welcomeMessage: config.welcomeMessage,
          offlineMessage: config.offlineMessage,
        busyMessage: config.busyMessage,
        autoReply: config.autoReply,
        showOnHomepage: config.showOnHomepage,
        showOnOrderPage: config.showOnOrderPage,
        showOnSellerPage: config.showOnSellerPage,
        floatingButtonEnabled: config.floatingButtonEnabled,
        floatingButtonPosition: config.floatingButtonPosition,
        floatingButtonColor: config.floatingButtonColor,
      },
    });
  } catch (error: any) {
    console.error('获取客服配置失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取客服配置失败',
    }, { status: 500 });
  }
}
