import { NextRequest, NextResponse } from 'next/server';
import { db, orders } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { executeAutoSplit } from '@/lib/platform-split-service';
import { transformDbOrderToApiFormat } from '@/lib/order-service';

/**
 * 获取订单详情
 * GET /api/orders/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const orderList = await db.select().from(orders).where(eq(orders.id, id));

    if (!orderList || orderList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '订单不存在'
      }, { status: 404 });
    }

    // 使用API格式转换函数
    const orderData = transformDbOrderToApiFormat(orderList[0]);

    return NextResponse.json({
      success: true,
      data: orderData
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 完成订单（用户手动归还）
 * 
 * 使用场景：
 * 1. 用户提前归还账号
 * 2. 用户主动结束租赁
 * 
 * POST /api/orders/[id]/complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    if (action === 'complete') {
      // 1. 查询订单
      const orderList = await db.select().from(orders).where(eq(orders.id, id));

      if (!orderList || orderList.length === 0) {
        return NextResponse.json({
          success: false,
          error: '订单不存在'
        }, { status: 404 });
      }

      const order = orderList[0];

      // 2. 检查订单状态
      if (order.status !== 'active') {
        return NextResponse.json({
          success: false,
          error: `订单状态不正确，当前状态：${order.status}，只有进行中的订单才能归还`
        }, { status: 400 });
      }

      // 3. 检查是否已经分账
      if (order.isSettled) {
        return NextResponse.json({
          success: false,
          error: '订单已经分账，不能重复操作'
        }, { status: 400 });
      }

      // 4. 更新订单状态为待验收
      const now = new Date().toISOString();
      const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48小时后

      await db
        .update(orders)
        .set({
          status: 'pending_verification', // 改为待验收状态
          actualEndTime: now,
          verificationRequestTime: now,
          verificationDeadline: deadline,
          verificationResult: 'pending',
          updatedAt: now
        })
        .where(eq(orders.id, id));

      return NextResponse.json({
        success: true,
        message: '账号归还成功，等待卖家验收（48小时内完成验收）',
        data: {
          orderId: id,
          orderNo: order.orderNo,
          status: 'pending_verification',
          verificationDeadline: deadline,
          note: '卖家验收通过后，订单将自动完成并分账；若发现异常可发起纠纷'
        }
      });
    } else if (action === 'cancel') {
      // 取消订单逻辑待实现
      return NextResponse.json({
        success: false,
        error: '取消订单功能待实现'
      }, { status: 501 });
    } else {
      return NextResponse.json({
        success: false,
        error: '未知的操作'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('完成订单失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '完成订单失败'
    }, { status: 500 });
  }
}
