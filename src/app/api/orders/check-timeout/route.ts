import { NextRequest, NextResponse } from 'next/server';
import { checkAndCancelTimeoutOrders, getTimeoutOrders } from '@/lib/order-timeout-service';

/**
 * 检查并取消超时订单
 * POST /api/orders/check-timeout
 */
export async function POST(request: NextRequest) {
  try {
    // 检查并取消超时订单
    const result = await checkAndCancelTimeoutOrders();

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 获取超时订单列表
 * GET /api/orders/check-timeout
 */
export async function GET(request: NextRequest) {
  try {
    // 获取超时订单列表
    const result = await getTimeoutOrders();

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
