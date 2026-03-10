import { NextRequest, NextResponse } from 'next/server';
import { sendOrderPaidNotification } from '@/lib/notification-service';

/**
 * 订单支付成功，触发通知
 * POST /api/notifications/order-paid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, createChatGroup } = body;

    if (!orderId) {
      return NextResponse.json({
        success: false,
        error: '订单ID不能为空'
      }, { status: 400 });
    }

    // 发送订单支付成功通知
    const result = await sendOrderPaidNotification(orderId, createChatGroup !== false);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('发送订单支付成功通知失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
