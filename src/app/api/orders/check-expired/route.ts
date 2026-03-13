import { NextRequest, NextResponse } from 'next/server';
import { syncExpiredOrders } from '@/lib/order-lifecycle-service';

/**
 * 服务端订单生命周期收口接口
 *
 * 1. active 且已到 endTime -> pending_verification
 * 2. pending_verification 且已超过 verificationDeadline -> completed + 分账
 *
 * 这个接口应该由服务端定时任务调用，而不是前端页面轮询。
 */
export async function GET(_request: NextRequest) {
  try {
    const result = await syncExpiredOrders();

    if (result.expiredActiveCount === 0 && result.autoVerifiedCount === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要处理的订单',
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      message: `检查完成，到期转验号 ${result.expiredActiveCount} 笔，自动完结 ${result.autoVerifiedCount} 笔，失败 ${result.failedCount} 笔`,
      ...result,
    });
  } catch (error: any) {
    console.error('检查到期订单失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '检查到期订单失败',
    }, { status: 500 });
  }
}
