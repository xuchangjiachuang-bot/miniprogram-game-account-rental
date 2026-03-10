import { NextRequest, NextResponse } from 'next/server';
import {
  createPayment,
  getPaymentByOrderId,
  mockPaymentSuccess,
  CreatePaymentParams,
  PaymentType
} from '@/lib/payment-service';

/**
 * 获取支付记录
 * GET /api/payments?order_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({
        success: false,
        error: '缺少 order_id 参数'
      }, { status: 400 });
    }

    const payment = getPaymentByOrderId(orderId);

    if (!payment) {
      return NextResponse.json({
        success: false,
        error: '支付记录不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: payment
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 创建支付订单
 * POST /api/payments
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const params: CreatePaymentParams = {
      order_id: body.order_id,
      user_id: body.user_id,
      payment_type: body.payment_type,
      amount: body.amount
    };

    // 验证必填字段
    if (!params.order_id || !params.user_id || !params.payment_type || !params.amount) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段'
      }, { status: 400 });
    }

    const result = createPayment(params);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 模拟支付成功（测试用）
 * PATCH /api/payments
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const { payment_no, success } = body;

    if (!payment_no || success === undefined) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段'
      }, { status: 400 });
    }

    const result = mockPaymentSuccess({ payment_no, success });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
