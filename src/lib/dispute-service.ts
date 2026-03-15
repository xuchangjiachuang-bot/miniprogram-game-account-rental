import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { checkWechatPayConfig } from '@/lib/wechat/config';
import { refund } from '@/lib/wechat/refund';
import { generateNonceStr, yuanToFen } from '@/lib/wechat/utils';
import { db, disputes, orders, paymentRecords, users } from './db';
import { executeAutoSplit } from './platform-split-service';

export type DisputeDecision = 'refund_buyer_full' | 'resume_order' | 'complete_order';

export interface DisputeView {
  id: string;
  orderId: string;
  initiatorId: string;
  initiatorName: string;
  respondentId: string;
  respondentName: string;
  status: string;
  disputeType: string;
  reason: string;
  evidence: unknown;
  resolution: string | null;
  compensation: number;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
}

function toNumber(value: unknown) {
  return Number(value) || 0;
}

async function loadDisputeParticipants(initiatorId: string, respondentId: string) {
  const userRows = await db
    .select({
      id: users.id,
      nickname: users.nickname,
      phone: users.phone,
    })
    .from(users);

  const userMap = new Map(
    userRows.map((user) => [user.id, user.nickname || user.phone || user.id]),
  );

  return {
    initiatorName: userMap.get(initiatorId) || initiatorId,
    respondentName: userMap.get(respondentId) || respondentId,
  };
}

export async function getOrderDispute(orderId: string): Promise<DisputeView | null> {
  const disputeRows = await db
    .select()
    .from(disputes)
    .where(eq(disputes.orderId, orderId))
    .limit(1);

  const dispute = disputeRows[0];
  if (!dispute) {
    return null;
  }

  const participants = await loadDisputeParticipants(dispute.initiatorId, dispute.respondentId);

  return {
    id: dispute.id,
    orderId: dispute.orderId,
    initiatorId: dispute.initiatorId,
    initiatorName: participants.initiatorName,
    respondentId: dispute.respondentId,
    respondentName: participants.respondentName,
    status: dispute.status || 'pending',
    disputeType: dispute.disputeType,
    reason: dispute.reason,
    evidence: dispute.evidence,
    resolution: dispute.resolution,
    compensation: toNumber(dispute.compensation),
    createdAt: dispute.createdAt,
    updatedAt: dispute.updatedAt,
    resolvedAt: dispute.resolvedAt,
  };
}

export async function createOrderDispute(params: {
  orderId: string;
  initiatorId: string;
  reason: string;
  evidence?: unknown;
  disputeType?: string;
}) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, params.orderId))
    .limit(1);

  const order = orderRows[0];
  if (!order) {
    throw new Error('订单不存在');
  }

  if (![order.buyerId, order.sellerId].includes(params.initiatorId)) {
    throw new Error('无权为该订单发起纠纷');
  }

  if (!['active', 'pending_verification', 'disputed'].includes(order.status || '')) {
    throw new Error(`当前订单状态不支持发起纠纷：${order.status}`);
  }

  const existing = await getOrderDispute(params.orderId);
  if (existing && existing.status === 'pending') {
    return existing;
  }

  const respondentId = order.buyerId === params.initiatorId ? order.sellerId : order.buyerId;
  const now = new Date().toISOString();
  const disputeId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(disputes).values({
      id: disputeId,
      orderId: order.id,
      initiatorId: params.initiatorId,
      respondentId,
      status: 'pending',
      disputeType: params.disputeType || 'after_sale',
      reason: params.reason.trim(),
      evidence: params.evidence ?? null,
      resolution: null,
      compensation: '0',
      createdAt: now,
      updatedAt: now,
    });

    await tx
      .update(orders)
      .set({
        status: 'disputed',
        disputeId,
        disputeReason: params.reason.trim(),
        disputeEvidence: params.evidence ?? null,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));
  });

  return getOrderDispute(params.orderId);
}

async function requestFullRefund(orderId: string, reason: string) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = orderRows[0];

  if (!order) {
    throw new Error('订单不存在');
  }

  if (order.isSettled) {
    throw new Error('订单已分账，不能直接发起全额退款');
  }

  if (!order.transactionId) {
    throw new Error('订单缺少微信支付流水号，无法发起原路退款');
  }

  const configCheck = await checkWechatPayConfig();
  if (!configCheck.valid) {
    throw new Error(`微信支付配置不完整：${configCheck.missing.join(', ')}`);
  }

  const existingRefund = await db
    .select({ id: paymentRecords.id })
    .from(paymentRecords)
    .where(and(eq(paymentRecords.orderId, order.id), eq(paymentRecords.type, 'refund')))
    .limit(1);

  if (existingRefund.length > 0) {
    throw new Error('该订单已存在退款记录');
  }

  const refundAmount = toNumber(order.totalPrice);
  const outRefundNo = `RF${order.id.replace(/-/g, '').slice(0, 16)}${generateNonceStr(8)}`;
  const refundResult = await refund({
    transactionId: order.transactionId || undefined,
    outTradeNo: order.id,
    outRefundNo,
    totalFee: yuanToFen(refundAmount),
    refundFee: yuanToFen(refundAmount),
    refundDesc: reason,
  });

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.insert(paymentRecords).values({
      id: randomUUID(),
      orderId: order.id,
      orderNo: order.orderNo,
      userId: order.buyerId,
      amount: refundAmount.toFixed(2),
      type: 'refund',
      method: 'wechat',
      transactionId: refundResult.refundId || '',
      thirdPartyOrderId: outRefundNo,
      status: 'processing',
      failureReason: reason,
      createdAt: now,
      updatedAt: now,
    });

    await tx
      .update(orders)
      .set({
        status: 'refunding',
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));
  });

  return {
    refundId: outRefundNo,
    refundAmount,
  };
}

export async function resolveOrderDispute(params: {
  orderId: string;
  decision: DisputeDecision;
  remark: string;
  adminName: string;
}) {
  const disputeRows = await db
    .select()
    .from(disputes)
    .where(eq(disputes.orderId, params.orderId))
    .limit(1);

  const dispute = disputeRows[0];
  if (!dispute) {
    throw new Error('纠纷单不存在');
  }

  if (dispute.status !== 'pending') {
    throw new Error(`纠纷单已处理，当前状态：${dispute.status}`);
  }

  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, params.orderId))
    .limit(1);
  const order = orderRows[0];

  if (!order) {
    throw new Error('订单不存在');
  }

  const now = new Date().toISOString();
  const resolutionRemark = `管理员 ${params.adminName}：${params.remark.trim() || '已处理纠纷'}`;

  if (params.decision === 'refund_buyer_full') {
    const refundResult = await requestFullRefund(params.orderId, params.remark.trim() || '平台判定全额退款');

    await db
      .update(disputes)
      .set({
        status: 'resolved',
        resolution: `全额退款给买家。${resolutionRemark}`,
        updatedAt: now,
        resolvedAt: now,
      })
      .where(eq(disputes.id, dispute.id));

    return {
      success: true,
      message: '已发起全额退款，等待微信回调完成',
      data: {
        decision: params.decision,
        refundId: refundResult.refundId,
        refundAmount: refundResult.refundAmount,
        orderStatus: 'refunding',
      },
    };
  }

  if (params.decision === 'resume_order') {
    const resumeStatus = order.actualEndTime ? 'pending_verification' : 'active';

    await db.transaction(async (tx) => {
      await tx
        .update(disputes)
        .set({
          status: 'resolved',
          resolution: `驳回纠纷并恢复订单。${resolutionRemark}`,
          updatedAt: now,
          resolvedAt: now,
        })
        .where(eq(disputes.id, dispute.id));

      await tx
        .update(orders)
        .set({
          status: resumeStatus,
          updatedAt: now,
        })
        .where(eq(orders.id, order.id));
    });

    return {
      success: true,
      message: '纠纷已驳回，订单已恢复',
      data: {
        decision: params.decision,
        orderStatus: resumeStatus,
      },
    };
  }

  if (params.decision === 'complete_order') {
    if (order.isSettled) {
      throw new Error('订单已分账，不能重复处理');
    }

    await db
      .update(orders)
      .set({
        status: 'completed',
        verificationResult: 'passed',
        verificationRemark: params.remark.trim() || '平台裁定按正常完成订单处理',
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    const splitResult = await executeAutoSplit(order.id);
    if (!splitResult.success) {
      throw new Error(splitResult.message);
    }

    await db
      .update(disputes)
      .set({
        status: 'resolved',
        resolution: `驳回纠纷并完成订单。${resolutionRemark}`,
        updatedAt: now,
        resolvedAt: now,
      })
      .where(eq(disputes.id, dispute.id));

    return {
      success: true,
      message: '纠纷已处理，订单已完成并分账',
      data: {
        decision: params.decision,
        orderStatus: 'completed',
        sellerIncome: splitResult.sellerIncome,
        platformCommission: splitResult.platformCommission,
      },
    };
  }

  throw new Error('不支持的纠纷处理动作');
}
