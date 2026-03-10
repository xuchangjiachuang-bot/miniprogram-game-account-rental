import { NextRequest, NextResponse } from 'next/server';
import { db, orders, accounts } from '@/lib/db';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { executeAutoSplit } from '@/lib/platform-split-service';

/**
 * 检查并处理到期订单
 *
 * 定时任务调用此API，检查两类订单：
 * 1. 到期的 active 订单（租期结束）：改为待验收状态
 * 2. 超时的 pending_verification 订单（验收超时）：自动完成并分账
 *
 * 业务逻辑：
 *
 * 1. 检查到期的 active 订单：
 *    - 订单状态：active → pending_verification
 *    - 设置验收截止时间（48小时后）
 *    - 通知卖家验收
 *
 * 2. 检查超时的 pending_verification 订单：
 *    - 订单状态：pending_verification → completed
 *    - 执行分账
 *    - 退还买家押金
 *
 * GET /api/orders/check-expired
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString();

    let expiredActiveCount = 0; // 到期的active订单
    let autoVerifiedCount = 0; // 超时自动完成的订单
    let failedCount = 0;
    const errors: Array<{ orderNo: string; error: string }> = [];

    // ==================== 1. 检查到期的 active 订单 ====================

    const expiredActiveOrders = await db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        endTime: orders.endTime,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'active'), // 订单状态为进行中
          lt(orders.endTime, now) // 当前时间 > 结束时间
        )
      );

    if (expiredActiveOrders.length > 0) {
      console.log(`发现 ${expiredActiveOrders.length} 个到期的订单，改为待验收状态...`);

      for (const order of expiredActiveOrders) {
        try {
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
            .where(eq(orders.id, order.id));

          console.log(`订单 ${order.orderNo} 已改为待验收状态，验收截止时间：${deadline}`);
          expiredActiveCount++;
        } catch (error: any) {
          console.error(`处理订单 ${order.orderNo} 失败:`, error);
          failedCount++;
          errors.push({
            orderNo: order.orderNo,
            error: error.message || '未知错误'
          });
        }
      }
    }

    // ==================== 2. 检查超时的 pending_verification 订单 ====================

    const timeoutOrders = await db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'pending_verification'), // 订单状态为待验收
          lt(orders.verificationDeadline, now) // 当前时间 > 验收截止时间
        )
      );

    if (timeoutOrders.length > 0) {
      console.log(`发现 ${timeoutOrders.length} 个超时未验收的订单，自动完成并分账...`);

      for (const order of timeoutOrders) {
        try {
          // 更新订单状态为已完成
          await db
            .update(orders)
            .set({
              status: 'completed',
              verificationResult: 'passed',
              verificationRemark: '超时自动验收通过',
              updatedAt: now
            })
            .where(eq(orders.id, order.id));

          // 执行分账
          const splitResult = await executeAutoSplit(order.id);

          if (!splitResult.success) {
            throw new Error(splitResult.message);
          }

          console.log(`订单 ${order.orderNo} 已自动完成并分账`);
          autoVerifiedCount++;
        } catch (error: any) {
          console.error(`处理订单 ${order.orderNo} 失败:`, error);
          failedCount++;
          errors.push({
            orderNo: order.orderNo,
            error: error.message || '未知错误'
          });
        }
      }
    }

    // ==================== 3. 返回处理结果 ====================

    if (expiredActiveCount === 0 && autoVerifiedCount === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要处理的订单',
        expiredActiveCount: 0,
        autoVerifiedCount: 0,
        failedCount: 0
      });
    }

    return NextResponse.json({
      success: true,
      message: `检查完成，到期订单：${expiredActiveCount}个，超时自动完成：${autoVerifiedCount}个，失败：${failedCount}个`,
      expiredActiveCount,
      autoVerifiedCount,
      failedCount,
      errors: failedCount > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('检查到期订单失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '检查到期订单失败'
    }, { status: 500 });
  }
}
