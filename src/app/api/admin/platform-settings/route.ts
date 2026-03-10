import { NextRequest, NextResponse } from 'next/server';
import { db, admins, platformSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { broadcastConfigUpdate } from '@/lib/sse-broadcaster';

/**
 * 获取平台设置
 * GET /api/admin/platform-settings
 * 注意：此接口允许所有用户（包括未登录用户）访问，因为平台配置是公开信息
 */
export async function GET() {
  try {
    // 获取平台设置（无需验证权限，因为配置是公开的）
    const [setting] = await db
      .select()
      .from(platformSettings)
      .limit(1);

    if (!setting) {
      // 返回默认设置
      const defaultSettings = {
        commissionRate: 5,
        minCommission: 0,
        maxCommission: 100,
        withdrawalFee: 1,
        minRentalPrice: 50,
        depositRatio: 50,
        coinsPerDay: 10,
        minRentalHours: 24,
        maxCoinsPerAccount: 1000,
        maxDeposit: 10000,
        requireManualReview: true,
        autoApproveVerified: false,
        listingDepositAmount: 50,
        orderPaymentTimeout: 1800,
        wechatMpAppId: '',
        wechatMpAppSecret: '',
        wechatOpenAppId: '',
        wechatOpenAppSecret: '',
        wechatToken: '',
        wechatEncodingAESKey: ''
      };

      return NextResponse.json({
        success: true,
        data: defaultSettings
      });
    }

    return NextResponse.json({
      success: true,
      data: setting
    });
  } catch (error: any) {
    console.error('获取平台设置失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取平台设置失败'
    }, { status: 500 });
  }
}

/**
 * 更新平台设置
 * PUT /api/admin/platform-settings
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限 - 从Cookie中获取admin_token
    const cookieHeader = request.headers.get('cookie');
    const adminToken = cookieHeader
      ?.split('; ')
      ?.find(row => row.startsWith('admin_token='))
      ?.split('=')[1];

    if (!adminToken) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
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

    const body = await request.json();

    // 检查是否已存在设置
    const [existing] = await db.select().from(platformSettings).limit(1);

    if (existing) {
      // 更新现有设置
      await db
        .update(platformSettings)
        .set({
          commissionRate: body.commissionRate,
          minCommission: body.minCommission,
          maxCommission: body.maxCommission,
          withdrawalFee: body.withdrawalFee,
          minRentalPrice: body.minRentalPrice,
          depositRatio: body.depositRatio,
          coinsPerDay: body.coinsPerDay,
          minRentalHours: body.minRentalHours,
          maxCoinsPerAccount: body.maxCoinsPerAccount,
          maxDeposit: body.maxDeposit,
          requireManualReview: body.requireManualReview,
          autoApproveVerified: body.autoApproveVerified,
          listingDepositAmount: body.listingDepositAmount,
          orderPaymentTimeout: body.orderPaymentTimeout,
          wechatMpAppId: body.wechatMpAppId || '',
          wechatMpAppSecret: body.wechatMpAppSecret || '',
          wechatOpenAppId: body.wechatOpenAppId || '',
          wechatOpenAppSecret: body.wechatOpenAppSecret || '',
          wechatToken: body.wechatToken || '',
          wechatEncodingAESKey: body.wechatEncodingAESKey || ''
        })
        .where(eq(platformSettings.id, existing.id));
    } else {
      // 创建新设置
      await db.insert(platformSettings).values({
        commissionRate: body.commissionRate,
        minCommission: body.minCommission,
        maxCommission: body.maxCommission,
        withdrawalFee: body.withdrawalFee,
        minRentalPrice: body.minRentalPrice,
        depositRatio: body.depositRatio,
        coinsPerDay: body.coinsPerDay,
        minRentalHours: body.minRentalHours,
        maxCoinsPerAccount: body.maxCoinsPerAccount,
        maxDeposit: body.maxDeposit,
        requireManualReview: body.requireManualReview,
        autoApproveVerified: body.autoApproveVerified,
        listingDepositAmount: body.listingDepositAmount,
        orderPaymentTimeout: body.orderPaymentTimeout,
        wechatMpAppId: body.wechatMpAppId || '',
        wechatMpAppSecret: body.wechatMpAppSecret || '',
        wechatOpenAppId: body.wechatOpenAppId || '',
        wechatOpenAppSecret: body.wechatOpenAppSecret || '',
        wechatToken: body.wechatToken || '',
        wechatEncodingAESKey: body.wechatEncodingAESKey || ''
      });
    }

    // 广播配置更新事件（通知所有客户端）
    broadcastConfigUpdate('settings');

    return NextResponse.json({
      success: true,
      message: '平台设置已更新',
      data: body
    });
  } catch (error: any) {
    console.error('更新平台设置失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '更新平台设置失败'
    }, { status: 500 });
  }
}
