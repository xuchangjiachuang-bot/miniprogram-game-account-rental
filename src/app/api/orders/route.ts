import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/server-auth';
import {
  createOrder,
  getUserOrdersWithCounts,
  CreateOrderParams,
} from '@/lib/order-service';
import { ensureDatabaseInitialized } from '@/lib/db';

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

    const body = await request.json();
    const params: CreateOrderParams = {
      account_id: body.account_id,
      buyer_id: body.buyer_id,
      seller_id: body.seller_id,
      coins_million: body.coins_million,
      price_ratio: body.price_ratio,
      rent_amount: body.rent_amount,
      deposit_amount: body.deposit_amount,
      total_amount: body.total_amount,
      rent_hours: body.rent_hours,
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
