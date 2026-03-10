import { NextRequest, NextResponse } from 'next/server';
import { db, orders } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { executeAutoSplit } from '@/lib/platform-split-service';

/**
 * 卖家验收API
 *
 * POST /api/orders/[id]/verify
 *
 * 参数：
 * - action: 'pass' | 'reject' | 'auto'（自动完成，超时使用）
 * - remark: 验收备注
 * - evidence: 纠纷证据（仅在action='reject'时需要）
 *
 * 业务逻辑：
 * 1. 验收通过（pass）：
 *    - 订单状态：pending_verification → completed
 *    - 执行分账
 *    - 退还买家押金
 *
 * 2. 验收拒绝（reject）：
 *    - 订单状态：pending_verification → disputed
 *    - 创建纠纷记录
 *    - 等待平台审核
 *
 * 3. 自动完成（auto）：
 *    - 卖家超时未验收（48小时后）
 *    - 订单状态：pending_verification → completed
 *    - 执行分账
 *    - 退还买家押金
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, remark, evidence } = body;

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
    if (order.status !== 'pending_verification') {
      return NextResponse.json({
        success: false,
        error: `订单状态不正确，当前状态：${order.status}，只有待验收的订单才能进行验收操作`
      }, { status: 400 });
    }

    // 3. 检查是否已经分账
    if (order.isSettled) {
      return NextResponse.json({
        success: false,
        error: '订单已经分账，不能重复操作'
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 4. 根据操作类型处理
    if (action === 'pass') {
      // 验收通过
      await db
        .update(orders)
        .set({
          status: 'completed',
          verificationResult: 'passed',
          verificationRemark: remark || '验收通过',
          updatedAt: now
        })
        .where(eq(orders.id, id));

      // 执行分账
      const splitResult = await executeAutoSplit(id);

      if (!splitResult.success) {
        throw new Error(splitResult.message);
      }

      return NextResponse.json({
        success: true,
        message: '验收通过，订单已完成并分账',
        data: {
          orderId: id,
          orderNo: order.orderNo,
          status: 'completed',
          platformCommission: splitResult.platformCommission,
          sellerIncome: splitResult.sellerIncome,
          buyerRefund: splitResult.buyerRefund
        }
      });

    } else if (action === 'reject') {
      // 验收拒绝，发起纠纷
      await db
        .update(orders)
        .set({
          status: 'disputed',
          verificationResult: 'rejected',
          verificationRemark: remark || '验收失败，发起纠纷',
          disputeEvidence: evidence ? JSON.stringify(evidence) : null,
          disputeReason: remark || '账号状态异常',
          updatedAt: now
        })
        .where(eq(orders.id, id));

      return NextResponse.json({
        success: true,
        message: '验收已拒绝，纠纷已创建，平台将介入审核',
        data: {
          orderId: id,
          orderNo: order.orderNo,
          status: 'disputed',
          note: '平台将在24小时内审核纠纷，审核完成后将根据结果处理资金'
        }
      });

    } else if (action === 'auto') {
      // 超时自动验收通过
      await db
        .update(orders)
        .set({
          status: 'completed',
          verificationResult: 'passed',
          verificationRemark: '超时自动验收通过',
          updatedAt: now
        })
        .where(eq(orders.id, id));

      // 执行分账
      const splitResult = await executeAutoSplit(id);

      if (!splitResult.success) {
        throw new Error(splitResult.message);
      }

      return NextResponse.json({
        success: true,
        message: '超时自动验收通过，订单已完成并分账',
        data: {
          orderId: id,
          orderNo: order.orderNo,
          status: 'completed',
          platformCommission: splitResult.platformCommission,
          sellerIncome: splitResult.sellerIncome,
          buyerRefund: splitResult.buyerRefund
        }
      });

    } else {
      return NextResponse.json({
        success: false,
        error: '未知的操作类型，必须是 pass、reject 或 auto'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('验收操作失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '验收操作失败'
    }, { status: 500 });
  }
}
