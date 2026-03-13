import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import {
  createOrder,
  getUserOrdersWithCounts,
  CreateOrderParams,
} from '@/lib/order-service';
import { syncExpiredOrders } from '@/lib/order-lifecycle-service';
import { accounts, ensureDatabaseInitialized, db } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '未登录',
        },
        { status: 401 }
      );
    }

    try {
      await syncExpiredOrders();
    } catch (error) {
      console.warn('[GET /api/orders] Failed to sync expired orders:', error);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const result = await getUserOrdersWithCounts(userId, status as any);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        orders: result.list,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/orders] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '未登录',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const accountId = body.account_id as string | undefined;
    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少账号ID',
        },
        { status: 400 }
      );
    }

    const accountList = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (accountList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '账号不存在',
        },
        { status: 404 }
      );
    }

    const account = accountList[0];
    if (account.status !== 'available') {
      return NextResponse.json(
        {
          success: false,
          error: '账号当前不可下单',
        },
        { status: 400 }
      );
    }

    const params: CreateOrderParams = {
      account_id: account.id,
      buyer_id: userId,
      seller_id: account.sellerId,
      coins_million: Number(account.coinsM || 0),
      price_ratio: Number(account.rentalRatio || 0),
      rent_amount: Number(account.accountValue || account.recommendedRental || 0),
      deposit_amount: Number(account.deposit || 0),
      total_amount: Number(account.totalPrice || Number(account.accountValue || account.recommendedRental || 0) + Number(account.deposit || 0)),
      rent_hours: Number(body.rent_hours || account.rentalHours || 24),
    };

    if (!params.account_id || !params.buyer_id || !params.seller_id) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填字段',
        },
        { status: 400 }
      );
    }

    const order = await createOrder(params);

    return NextResponse.json({
      success: true,
      message: '订单创建成功',
      data: order,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
