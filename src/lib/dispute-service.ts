import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { restoreAccountAvailabilityIfNoBlockingOrders } from './account-service';
import {
  balanceTransactions,
  chatMessages,
  db,
  disputes,
  groupChats,
  orderConsumptionSettlements,
  orders,
  paymentRecords,
  userBalances,
  users,
} from './db';
import { safeLogFinanceAuditEvent } from './finance-audit-service';
import { getLatestConsumptionSettlement } from './order-consumption-service';
import { settleCompletedOrder } from './order-settlement-service';
import { checkWechatPayConfig } from '@/lib/wechat/config';
import { refund } from '@/lib/wechat/refund';
import { generateNonceStr, yuanToFen } from '@/lib/wechat/utils';

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

async function sendDisputeSystemMessage(orderId: string, content: string) {
  const groupRows = await db.select().from(groupChats).where(eq(groupChats.orderId, orderId)).limit(1);
  const group = groupRows[0];
  if (!group) {
    return;
  }

  const now = new Date().toISOString();
  await db.insert(chatMessages).values({
    groupChatId: group.id,
    senderId: '00000000-0000-0000-0000-000000000000',
    senderType: 'system',
    content,
    messageType: 'system',
    createdAt: now,
  });

  await db.update(groupChats).set({ updatedAt: now }).where(eq(groupChats.id, group.id));
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
    .orderBy(disputes.createdAt);

  const dispute = [...disputeRows].sort((a, b) => {
    const pendingDelta = Number(b.status === 'pending') - Number(a.status === 'pending');
    if (pendingDelta !== 0) {
      return pendingDelta;
    }

    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  })[0];
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

  if (!['active', 'pending_verification', 'pending_consumption_confirm', 'disputed'].includes(order.status || '')) {
    throw new Error(`当前订单状态不支持发起纠纷：${order.status}`);
  }

  const pendingDisputeRows = await db
    .select()
    .from(disputes)
    .where(and(eq(disputes.orderId, params.orderId), eq(disputes.status, 'pending')))
    .orderBy(disputes.createdAt);

  const existingPendingDispute = pendingDisputeRows[pendingDisputeRows.length - 1];
  if (existingPendingDispute) {
    return getOrderDispute(existingPendingDispute.orderId);
  }

  const respondentId = order.buyerId === params.initiatorId ? order.sellerId : order.buyerId;
  const now = new Date().toISOString();
  const disputeId = randomUUID();
  const trimmedReason = params.reason.trim();

  await db.transaction(async (tx) => {
    await tx.insert(disputes).values({
      id: disputeId,
      orderId: order.id,
      initiatorId: params.initiatorId,
      respondentId,
      status: 'pending',
      disputeType: params.disputeType || 'after_sale',
      reason: trimmedReason,
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
        disputeReason: trimmedReason,
        disputeEvidence: params.evidence ?? null,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));
  });

  await sendDisputeSystemMessage(
    order.id,
    `订单已发起纠纷，原因：${trimmedReason}。平台将介入处理，请买卖双方在群内补充说明。`,
  );

  return getOrderDispute(params.orderId);
}

async function requestWalletFullRefund(order: typeof orders.$inferSelect, reason: string) {
  const refundAmount = toNumber(order.totalPrice);
  const depositAmount = toNumber(order.deposit);
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    const balanceRows = await tx
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, order.buyerId))
      .limit(1);

    const balance = balanceRows[0];
    if (!balance) {
      throw new Error('BUYER_BALANCE_NOT_FOUND');
    }

    const availableBefore = toNumber(balance.availableBalance);
    const frozenBefore = toNumber(balance.frozenBalance);
    const releasedFrozen = Math.min(frozenBefore, depositAmount);
    const availableCredit = Math.max(refundAmount - releasedFrozen, 0);
    const availableAfter = availableBefore + availableCredit;
    const frozenAfter = Math.max(frozenBefore - releasedFrozen, 0);

    await tx
      .update(userBalances)
      .set({
        availableBalance: availableAfter.toFixed(2),
        frozenBalance: frozenAfter.toFixed(2),
        updatedAt: now,
      })
      .where(eq(userBalances.userId, order.buyerId));

    if (availableCredit > 0) {
      await tx.insert(balanceTransactions).values({
        id: randomUUID(),
        userId: order.buyerId,
        orderId: order.id,
        transactionType: 'refund',
        amount: availableCredit.toFixed(2),
        balanceBefore: availableBefore.toFixed(2),
        balanceAfter: availableAfter.toFixed(2),
        description: `订单 ${order.orderNo} 争议全额退款返还租金`,
        createdAt: now,
      });
    }

    if (releasedFrozen > 0) {
      await tx.insert(balanceTransactions).values({
        id: randomUUID(),
        userId: order.buyerId,
        orderId: order.id,
        transactionType: 'unfreeze',
        amount: releasedFrozen.toFixed(2),
        balanceBefore: availableAfter.toFixed(2),
        balanceAfter: availableAfter.toFixed(2),
        description: `订单 ${order.orderNo} 争议全额退款解冻押金`,
        createdAt: now,
      });
    }

    await tx.insert(paymentRecords).values({
      id: randomUUID(),
      orderId: order.id,
      orderNo: order.orderNo,
      userId: order.buyerId,
      amount: refundAmount.toFixed(2),
      type: 'refund',
      method: 'wallet',
      transactionId: '',
      thirdPartyOrderId: order.id,
      status: 'success',
      failureReason: reason,
      createdAt: now,
      updatedAt: now,
    });

    await tx
      .update(orders)
      .set({
        status: 'refunded',
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    await safeLogFinanceAuditEvent({
      eventType: 'order_refund_wallet_completed',
      status: 'success',
      userId: order.buyerId,
      orderId: order.id,
      amount: refundAmount,
      balanceBefore: availableBefore,
      balanceAfter: availableAfter,
      details: {
        orderNo: order.orderNo,
        reason,
        releasedFrozen,
        availableCredit,
      },
    }, tx);
  });

  await restoreAccountAvailabilityIfNoBlockingOrders(order.accountId);

  return {
    refundId: `WALLET-${order.id}`,
    refundAmount,
    walletRefund: true,
  };
}

async function requestWechatFullRefund(order: typeof orders.$inferSelect, reason: string) {
  const transactionId = order.transactionId || '';
  if (!transactionId) {
    throw new Error('ORDER_PAYMENT_TRANSACTION_MISSING');
  }

  const configCheck = await checkWechatPayConfig();
  if (!configCheck.valid) {
    throw new Error(`WECHAT_PAY_CONFIG_INVALID:${configCheck.missing.join(',')}`);
  }

  const refundAmount = toNumber(order.totalPrice);
  const outRefundNo = `RF${order.id.replace(/-/g, '').slice(0, 16)}${generateNonceStr(8)}`;
  const refundResult = await refund({
    transactionId,
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

    await safeLogFinanceAuditEvent({
      eventType: 'order_refund_requested',
      status: 'pending',
      userId: order.buyerId,
      orderId: order.id,
      amount: refundAmount,
      details: {
        orderNo: order.orderNo,
        outRefundNo,
        reason,
        transactionId,
      },
    }, tx);
  });

  return {
    refundId: outRefundNo,
    refundAmount,
    walletRefund: false,
  };
}

async function requestFullRefund(orderId: string, reason: string) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const order = orderRows[0];
  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  if (order.isSettled) {
    throw new Error('ORDER_ALREADY_SETTLED');
  }

  const existingRefund = await db
    .select({ id: paymentRecords.id })
    .from(paymentRecords)
    .where(and(eq(paymentRecords.orderId, order.id), eq(paymentRecords.type, 'refund')))
    .limit(1);

  if (existingRefund.length > 0) {
    throw new Error('ORDER_REFUND_ALREADY_EXISTS');
  }

  if (order.paymentMethod === 'wallet') {
    return requestWalletFullRefund(order, reason);
  }

  return requestWechatFullRefund(order, reason);
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
  const trimmedRemark = params.remark.trim();
  const resolutionRemark = `管理员 ${params.adminName}：${trimmedRemark || '已处理纠纷'}`;

  if (params.decision === 'refund_buyer_full') {
    const refundResult = await requestFullRefund(
      params.orderId,
      trimmedRemark || '平台判定全额退款',
    );

    await db
      .update(disputes)
      .set({
        status: 'resolved',
        resolution: `全额退款给买家。${resolutionRemark}`,
        updatedAt: now,
        resolvedAt: now,
      })
      .where(eq(disputes.id, dispute.id));

    await sendDisputeSystemMessage(
      order.id,
      `平台已裁定：全额退款给买家。${trimmedRemark || '请在订单页查看最终处理结果。'}`,
    );

    return {
      success: true,
      message: refundResult.walletRefund ? '已完成钱包全额退款' : '已发起全额退款，等待微信回调完成',
      data: {
        decision: params.decision,
        refundId: refundResult.refundId,
        refundAmount: refundResult.refundAmount,
        orderStatus: refundResult.walletRefund ? 'refunded' : 'refunding',
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

    await sendDisputeSystemMessage(
      order.id,
      `平台已裁定：驳回本次纠纷，订单恢复为${resumeStatus === 'pending_verification' ? '待验收' : '进行中'}。${trimmedRemark}`.trim(),
    );

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

    const consumptionSettlement = await getLatestConsumptionSettlement(order.id);

    await db
      .update(orders)
      .set({
        status: 'completed',
        verificationResult: 'passed',
        verificationRemark: trimmedRemark || '平台裁定按正常完成订单处理',
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    if (
      consumptionSettlement
      && ['pending_buyer_confirmation', 'disputed'].includes(consumptionSettlement.status)
    ) {
      await db
        .update(orderConsumptionSettlements)
        .set({
          status: 'confirmed',
          buyerRemark: trimmedRemark || '平台裁定按资源消耗结算执行',
          resolvedAt: now,
          updatedAt: now,
        })
        .where(eq(orderConsumptionSettlements.id, consumptionSettlement.id));
    }

    const splitResult = await settleCompletedOrder(order.id);
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

    await sendDisputeSystemMessage(
      order.id,
      `平台已裁定：驳回本次纠纷并完成订单结算。${trimmedRemark || '请在订单页查看最终处理结果。'}`,
    );

    return {
      success: true,
      message: '纠纷已处理，订单已完成并分账',
      data: {
        decision: params.decision,
        orderStatus: 'completed',
        isSettled: splitResult.settled,
        pendingDepositRefund: splitResult.pendingRefund,
        sellerIncome: splitResult.sellerIncome,
        platformCommission: splitResult.platformCommission,
      },
    };
  }

  throw new Error('不支持的纠纷处理动作');
}
