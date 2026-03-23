import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, orders } from '@/lib/db';
import { createOrderDispute } from '@/lib/dispute-service';
import { settleCompletedOrder } from '@/lib/order-settlement-service';
import { getServerUserId } from '@/lib/server-auth';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, remark, evidence } = body;
    const userId = getServerUserId(request);

    const orderList = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    const order = orderList[0];

    if (action === 'auto') {
      const adminAuth = await requireAdmin(request);
      if (adminAuth.error) {
        return adminAuth.error;
      }
    } else {
      if (!userId) {
        return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
      }

      if (order.sellerId !== userId) {
        return NextResponse.json({ success: false, error: '只有卖家可以执行验收操作' }, { status: 403 });
      }
    }

    const verificationAlreadyPassed = order.status === 'completed' && order.verificationResult === 'passed';

    if (order.status !== 'pending_verification' && !(verificationAlreadyPassed && (action === 'pass' || action === 'auto'))) {
      return NextResponse.json(
        {
          success: false,
          error: `当前订单状态不能验收：${order.status}`,
        },
        { status: 400 },
      );
    }

    if (order.isSettled && action !== 'pass' && action !== 'auto') {
      return NextResponse.json(
        {
          success: false,
          error: '订单已分账，不能重复处理',
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    if (action === 'pass' || action === 'auto') {
      const verificationRemark =
        action === 'auto' ? '超时自动验收通过' : remark || '验收通过';

      const updatedOrder = await db
        .update(orders)
        .set({
          status: 'completed',
          verificationResult: 'passed',
          verificationRemark,
          updatedAt: now,
        })
        .where(and(
          eq(orders.id, id),
          eq(orders.status, 'pending_verification'),
        ))
        .returning({
          id: orders.id,
          orderNo: orders.orderNo,
        });

      if (updatedOrder.length === 0) {
        const latestOrder = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
        const latest = latestOrder[0];

        if (!latest) {
          return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
        }

        if (latest.status !== 'completed' || latest.verificationResult !== 'passed') {
          return NextResponse.json(
            {
              success: false,
              error: `当前订单状态不能验收：${latest.status}`,
            },
            { status: 400 },
          );
        }
      }

      const splitResult = await settleCompletedOrder(id);
      if (!splitResult.success) {
        throw new Error(splitResult.message);
      }

      return NextResponse.json({
        success: true,
        message: splitResult.pendingRefund
          ? '验收已通过，买家押金退款处理中，退款完成后自动结算'
          : action === 'auto'
            ? '已自动验收通过并完成分账'
            : '验收通过，订单已完成并分账',
        data: {
          orderId: id,
          orderNo: order.orderNo,
          status: 'completed',
          isSettled: splitResult.settled,
          pendingDepositRefund: splitResult.pendingRefund,
          platformCommission: splitResult.platformCommission,
          sellerIncome: splitResult.sellerIncome,
          buyerRefund: splitResult.buyerRefund,
        },
      });
    }

    if (action === 'reject') {
      const dispute = await createOrderDispute({
        orderId: id,
        initiatorId: userId!,
        reason: remark || '账号状态异常，申请平台介入处理',
        evidence: evidence ?? null,
        disputeType: 'verification_failed',
      });

      await db
        .update(orders)
        .set({
          status: 'disputed',
          verificationResult: 'rejected',
          verificationRemark: remark || '验收失败，已发起纠纷',
          disputeEvidence: evidence ?? null,
          disputeReason: remark || '账号状态异常',
          disputeId: dispute?.id ?? null,
          updatedAt: now,
        })
        .where(eq(orders.id, id));

      return NextResponse.json({
        success: true,
        message: '验收已拒绝，纠纷已创建，平台将介入处理',
        data: {
          orderId: id,
          orderNo: order.orderNo,
          status: 'disputed',
          disputeId: dispute?.id ?? null,
          note: '平台将在24小时内审核纠纷，并根据结果处理资金',
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: '不支持的验收动作',
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('验收操作失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '验收操作失败',
      },
      { status: 500 },
    );
  }
}
