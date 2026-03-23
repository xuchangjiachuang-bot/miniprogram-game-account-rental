import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, admins, platformSettings } from '@/lib/db';
import {
  getOrderConsumptionCatalog,
  saveOrderConsumptionCatalog,
} from '@/lib/order-consumption-config';
import {
  getVerificationManualReviewEnabled,
  saveVerificationManualReviewEnabled,
} from '@/lib/verification-review-config';
import { broadcastConfigUpdate } from '@/lib/sse-broadcaster';

function sanitizePlatformSetting<T extends Record<string, any>>(setting: T) {
  return {
    ...setting,
    wechatMpAppSecret: '',
    wechatOpenAppSecret: '',
    wechatToken: '',
    wechatEncodingAESKey: '',
  };
}

function getDefaultSettings() {
  return {
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
    requireWithdrawalManualReview: true,
    autoApproveVerified: false,
    requireVerificationManualReview: true,
    listingDepositAmount: 50,
    orderPaymentTimeout: 180,
    wechatMpAppId: '',
    wechatMpAppSecret: '',
    wechatOpenAppId: '',
    wechatOpenAppSecret: '',
    wechatToken: '',
    wechatEncodingAESKey: '',
  };
}

function getAdminToken(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  return cookieHeader
    ?.split('; ')
    .find((row) => row.startsWith('admin_token='))
    ?.split('=')[1];
}

async function verifyAdmin(request: NextRequest) {
  const adminToken = getAdminToken(request);

  if (!adminToken) {
    return { error: NextResponse.json({ success: false, error: '未登录' }, { status: 401 }) };
  }

  const adminList = await db.select().from(admins).where(eq(admins.id, adminToken)).limit(1);
  if (adminList.length === 0) {
    return {
      error: NextResponse.json({ success: false, error: '管理员不存在' }, { status: 401 }),
    };
  }

  if (adminList[0].status !== 'active') {
    return {
      error: NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 }),
    };
  }

  return { admin: adminList[0] };
}

export async function GET() {
  try {
    const [setting] = await db.select().from(platformSettings).limit(1);
    const [orderConsumptionCatalog, requireVerificationManualReview] = await Promise.all([
      getOrderConsumptionCatalog(),
      getVerificationManualReviewEnabled(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...sanitizePlatformSetting(setting || getDefaultSettings()),
        orderConsumptionCatalog,
        requireVerificationManualReview,
      },
    });
  } catch (error: any) {
    console.error('获取平台设置失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取平台设置失败',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const [existing, currentOrderConsumptionCatalog, currentRequireVerificationManualReview] =
      await Promise.all([
        db.select().from(platformSettings).limit(1).then((rows) => rows[0]),
        getOrderConsumptionCatalog(),
        getVerificationManualReviewEnabled(),
      ]);

    const current = {
      ...(existing || getDefaultSettings()),
      requireVerificationManualReview: currentRequireVerificationManualReview,
    };

    const payload = {
      commissionRate: body.commissionRate ?? current.commissionRate,
      minCommission: body.minCommission ?? current.minCommission,
      maxCommission: body.maxCommission ?? current.maxCommission,
      withdrawalFee: body.withdrawalFee ?? current.withdrawalFee,
      minRentalPrice: body.minRentalPrice ?? current.minRentalPrice,
      depositRatio: body.depositRatio ?? current.depositRatio,
      coinsPerDay: body.coinsPerDay ?? current.coinsPerDay,
      minRentalHours: body.minRentalHours ?? current.minRentalHours,
      maxCoinsPerAccount: body.maxCoinsPerAccount ?? current.maxCoinsPerAccount,
      maxDeposit: body.maxDeposit ?? current.maxDeposit,
      requireManualReview: body.requireManualReview ?? current.requireManualReview,
      requireWithdrawalManualReview:
        body.requireWithdrawalManualReview ?? current.requireWithdrawalManualReview ?? true,
      autoApproveVerified: body.autoApproveVerified ?? current.autoApproveVerified,
      listingDepositAmount: body.listingDepositAmount ?? current.listingDepositAmount,
      orderPaymentTimeout: body.orderPaymentTimeout ?? current.orderPaymentTimeout,
      wechatMpAppId: body.wechatMpAppId ?? current.wechatMpAppId,
      wechatMpAppSecret: body.wechatMpAppSecret ?? current.wechatMpAppSecret,
      wechatOpenAppId: body.wechatOpenAppId ?? current.wechatOpenAppId,
      wechatOpenAppSecret: body.wechatOpenAppSecret ?? current.wechatOpenAppSecret,
      wechatToken: body.wechatToken ?? current.wechatToken,
      wechatEncodingAESKey: body.wechatEncodingAESKey ?? current.wechatEncodingAESKey,
    };

    if (existing) {
      await db.update(platformSettings).set(payload).where(eq(platformSettings.id, existing.id));
    } else {
      await db.insert(platformSettings).values(payload);
    }

    const [orderConsumptionCatalog, requireVerificationManualReview] = await Promise.all([
      saveOrderConsumptionCatalog(
        body.orderConsumptionCatalog ?? currentOrderConsumptionCatalog,
      ),
      saveVerificationManualReviewEnabled(
        body.requireVerificationManualReview ?? current.requireVerificationManualReview,
      ),
    ]);

    broadcastConfigUpdate('settings');

    return NextResponse.json({
      success: true,
      message: '平台设置已更新',
      data: {
        ...sanitizePlatformSetting(payload),
        orderConsumptionCatalog,
        requireVerificationManualReview,
      },
    });
  } catch (error: any) {
    console.error('更新平台设置失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '更新平台设置失败',
      },
      { status: 500 },
    );
  }
}
