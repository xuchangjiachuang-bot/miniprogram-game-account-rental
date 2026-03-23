import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';
import {
  createOrder,
  getUserOrdersWithCounts,
  CreateOrderParams,
} from '@/lib/order-service';
import { syncExpiredOrders } from '@/lib/order-lifecycle-service';
import { accounts, ensureDatabaseInitialized, db, orders } from '@/lib/db';
import { calculateOrderAmounts, calculateRentPrice } from '@/lib/split-service';

export const dynamic = 'force-dynamic';

function toNumber(value: unknown) {
  return Number(value || 0);
}

function resolveOrderPricing(account: typeof accounts.$inferSelect) {
  const directRentAmount = toNumber(account.accountValue) || toNumber(account.recommendedRental);
  const directDepositAmount = Math.max(toNumber(account.deposit), 0);
  const directTotalAmount = toNumber(account.totalPrice);
  const coinsMillion = toNumber(account.coinsM);
  const priceRatio = toNumber(account.rentalRatio);

  if (directRentAmount > 0) {
    return {
      rentAmount: directRentAmount,
      depositAmount: directDepositAmount,
      totalAmount: directTotalAmount > 0 ? directTotalAmount : directRentAmount + directDepositAmount,
    };
  }

  if (coinsMillion > 0 && priceRatio > 0) {
    const calculated = calculateOrderAmounts(coinsMillion, priceRatio);
    const rentAmount = calculateRentPrice(coinsMillion, priceRatio);
    const depositAmount = directDepositAmount > 0 ? directDepositAmount : calculated.deposit;
    return {
      rentAmount,
      depositAmount,
      totalAmount: directTotalAmount > 0 ? directTotalAmount : rentAmount + depositAmount,
    };
  }

  return {
    rentAmount: 0,
    depositAmount: directDepositAmount,
    totalAmount: 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '未登录',
        },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '登录状态已失效，请重新登录',
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
    const result = await getUserOrdersWithCounts(user.id, status as any);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        orders: result.list,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/orders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '加载订单失败',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '未登录',
        },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '登录状态已失效，请重新登录',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const accountId = body.account_id as string | undefined;
    const idempotencyKey = (
      request.headers.get('x-idempotency-key')
      || body.idempotency_key
      || ''
    ).trim();

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

    const existingPendingOrder = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.accountId, account.id),
        eq(orders.buyerId, user.id),
        eq(orders.status, 'pending_payment'),
        ...(idempotencyKey ? [eq(orders.idempotencyKey, idempotencyKey)] : []),
      ))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    if (existingPendingOrder.length > 0) {
      return NextResponse.json({
        success: true,
        message: '璁㈠崟鍒涘缓鎴愬姛',
        data: existingPendingOrder[0],
      });
    }

    if (account.status !== 'available') {
      return NextResponse.json(
        {
          success: false,
          error: '账号当前不可下单',
        },
        { status: 400 }
      );
    }

    if (account.sellerId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: '不能购买自己发布的账号',
        },
        { status: 400 }
      );
    }

    try {
      await syncExpiredOrders();
    } catch (error) {
      console.warn('[POST /api/orders] Failed to sync expired orders before create:', error);
    }

    const blockingOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.accountId, account.id),
          inArray(orders.status, ['pending_payment', 'paid', 'active', 'pending_verification', 'pending_consumption_confirm', 'disputed', 'refunding']),
        ),
      )
      .limit(1);

    if (blockingOrders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '该账号当前已有进行中的订单，请稍后再试',
        },
        { status: 409 }
      );
    }

    const pricing = resolveOrderPricing(account);
    if (pricing.rentAmount <= 0 || pricing.totalAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: '账号定价信息不完整，暂时无法下单，请卖家重新保存并上架该账号',
        },
        { status: 400 }
      );
    }

    const params: CreateOrderParams = {
      account_id: account.id,
      buyer_id: user.id,
      seller_id: account.sellerId,
      coins_million: Number(account.coinsM || 0),
      price_ratio: Number(account.rentalRatio || 0),
      rent_amount: pricing.rentAmount,
      deposit_amount: pricing.depositAmount,
      total_amount: pricing.totalAmount,
      rent_hours: Number(body.rent_hours || account.rentalHours || 24),
      idempotency_key: idempotencyKey || undefined,
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
    console.error('[POST /api/orders] Error:', error);
    if (error?.message === 'ACCOUNT_NOT_AVAILABLE') {
      return NextResponse.json(
        {
          success: false,
          error: '该账号当前已被占用，请稍后再试',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '创建订单失败',
      },
      { status: 500 }
    );
  }
}
