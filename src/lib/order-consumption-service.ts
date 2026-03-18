import { and, desc, eq } from 'drizzle-orm';
import {
  chatMessages,
  db,
  groupChats,
  orderConsumptionSettlementItems,
  orderConsumptionSettlements,
  orders,
  sqlClient,
} from '@/lib/db';
import { safeLogFinanceAuditEvent } from '@/lib/finance-audit-service';
import { createOrderDispute } from '@/lib/dispute-service';
import { settleCompletedOrder } from '@/lib/order-settlement-service';

export type OrderConsumptionSettlementStatus =
  | 'pending_buyer_confirmation'
  | 'confirmed'
  | 'rejected'
  | 'disputed'
  | 'cancelled';

export interface ConsumptionSettlementItemInput {
  itemName: string;
  unitPrice: number;
  unitLabel?: string;
  quantity: number;
  remark?: string;
}

function toMoney(value: unknown) {
  return Number(value || 0);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

let ensureOrdersStatusColumnPromise: Promise<void> | null = null;

async function ensureOrdersStatusColumnSupportsConsumption() {
  if (!ensureOrdersStatusColumnPromise) {
    ensureOrdersStatusColumnPromise = (async () => {
      const columnRows = await sqlClient<{ character_maximum_length: number | null }[]>`
        SELECT character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'orders'
          AND column_name = 'status'
        LIMIT 1
      `;

      const currentLength = Number(columnRows[0]?.character_maximum_length || 0);
      if (currentLength > 0 && currentLength < 40) {
        await sqlClient`
          ALTER TABLE orders
          ALTER COLUMN status TYPE VARCHAR(40)
        `;
      }
    })().catch((error) => {
      ensureOrdersStatusColumnPromise = null;
      throw error;
    });
  }

  await ensureOrdersStatusColumnPromise;
}

async function sendSettlementSystemMessage(orderId: string, content: string) {
  const groupRows = await db.select().from(groupChats).where(eq(groupChats.orderId, orderId)).limit(1);
  const group = groupRows[0];
  if (!group) {
    return;
  }

  await db.insert(chatMessages).values({
    groupChatId: group.id,
    senderId: '00000000-0000-0000-0000-000000000000',
    senderType: 'system',
    content,
    messageType: 'system',
    createdAt: new Date().toISOString(),
  });

  await db.update(groupChats).set({ updatedAt: new Date().toISOString() }).where(eq(groupChats.id, group.id));
}

function normalizeItems(items: ConsumptionSettlementItemInput[]) {
  return items
    .map((item, index) => {
      const unitPrice = roundMoney(toMoney(item.unitPrice));
      const quantity = roundMoney(toMoney(item.quantity));
      const subtotal = roundMoney(unitPrice * quantity);

      return {
        itemName: String(item.itemName || '').trim(),
        unitPrice,
        unitLabel: String(item.unitLabel || '个').trim() || '个',
        quantity,
        subtotal,
        remark: item.remark ? String(item.remark).trim() : null,
        sortOrder: index,
      };
    })
    .filter((item) => item.itemName && item.quantity > 0 && item.unitPrice >= 0);
}

export async function getLatestConsumptionSettlement(orderId: string) {
  const settlementRows = await db
    .select()
    .from(orderConsumptionSettlements)
    .where(eq(orderConsumptionSettlements.orderId, orderId))
    .orderBy(desc(orderConsumptionSettlements.createdAt))
    .limit(1);

  const settlement = settlementRows[0];
  if (!settlement) {
    return null;
  }

  const itemRows = await db
    .select()
    .from(orderConsumptionSettlementItems)
    .where(eq(orderConsumptionSettlementItems.settlementId, settlement.id));

  return {
    ...settlement,
    items: itemRows,
  };
}

export async function getApprovedConsumptionSummary(orderId: string) {
  const settlement = await getLatestConsumptionSettlement(orderId);
  if (!settlement || settlement.status !== 'confirmed') {
    return {
      hasApprovedSettlement: false,
      approvedAmount: 0,
      depositDeductedAmount: 0,
      buyerRefundAmount: 0,
      offlineSettledAmount: 0,
      settlement: null,
    };
  }

  return {
    hasApprovedSettlement: true,
    approvedAmount: toMoney(settlement.approvedAmount),
    depositDeductedAmount: toMoney(settlement.depositDeductedAmount),
    buyerRefundAmount: toMoney(settlement.buyerRefundAmount),
    offlineSettledAmount: toMoney(settlement.offlineSettledAmount),
    settlement,
  };
}

export async function submitConsumptionSettlement(params: {
  orderId: string;
  sellerId: string;
  items: ConsumptionSettlementItemInput[];
  sellerRemark?: string;
  evidence?: unknown;
  offlineSettledAmount?: number;
}) {
  await ensureOrdersStatusColumnSupportsConsumption();

  const orderRows = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
  const order = orderRows[0];
  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  if (order.sellerId !== params.sellerId) {
    throw new Error('ORDER_CONSUMPTION_FORBIDDEN');
  }

  if (order.status !== 'pending_verification') {
    throw new Error('ORDER_STATUS_INVALID_FOR_CONSUMPTION');
  }

  if (order.isSettled) {
    throw new Error('ORDER_ALREADY_SETTLED');
  }

  const normalizedItems = normalizeItems(params.items || []);
  if (normalizedItems.length === 0) {
    throw new Error('ORDER_CONSUMPTION_ITEMS_EMPTY');
  }

  const requestedAmount = roundMoney(
    normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
  );
  const depositAmount = roundMoney(toMoney(order.deposit));
  const offlineSettledAmount = Math.max(0, roundMoney(toMoney(params.offlineSettledAmount)));
  const approvedAmount = requestedAmount;
  const depositDeductedAmount = Math.min(depositAmount, approvedAmount);
  const buyerRefundAmount = Math.max(0, roundMoney(depositAmount - depositDeductedAmount));
  const now = new Date().toISOString();

  const existing = await getLatestConsumptionSettlement(order.id);
  if (existing && existing.status === 'pending_buyer_confirmation') {
    throw new Error('ORDER_CONSUMPTION_PENDING_CONFIRMATION');
  }

  const settlementId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(orderConsumptionSettlements).values({
      id: settlementId,
      orderId: order.id,
      sellerId: order.sellerId,
      buyerId: order.buyerId,
      status: 'pending_buyer_confirmation',
      pricingVersion: 'default-v1',
      requestedAmount: requestedAmount.toFixed(2),
      approvedAmount: approvedAmount.toFixed(2),
      offlineSettledAmount: offlineSettledAmount.toFixed(2),
      depositDeductedAmount: depositDeductedAmount.toFixed(2),
      buyerRefundAmount: buyerRefundAmount.toFixed(2),
      sellerRemark: params.sellerRemark?.trim() || null,
      evidence: params.evidence ?? null,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if (normalizedItems.length > 0) {
      await tx.insert(orderConsumptionSettlementItems).values(
        normalizedItems.map((item) => ({
          id: crypto.randomUUID(),
          settlementId,
          itemName: item.itemName,
          unitPrice: item.unitPrice.toFixed(2),
          unitLabel: item.unitLabel,
          quantity: item.quantity.toFixed(2),
          subtotal: item.subtotal.toFixed(2),
          remark: item.remark,
          sortOrder: item.sortOrder,
          createdAt: now,
        })),
      );
    }

    await tx
      .update(orders)
      .set({
        status: 'pending_consumption_confirm',
        verificationResult: 'pending',
        verificationRemark: '卖家已提交资源消耗结算单，待买家确认',
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    await safeLogFinanceAuditEvent({
      eventType: 'order_consumption_settlement_submitted',
      status: 'pending',
      userId: order.sellerId,
      orderId: order.id,
      amount: requestedAmount,
      details: {
        settlementId,
        itemCount: normalizedItems.length,
        depositAmount,
        depositDeductedAmount,
        buyerRefundAmount,
        offlineSettledAmount,
      },
    }, tx);
  });

  await sendSettlementSystemMessage(
    order.id,
    `卖家已提交资源消耗结算单，申请扣除押金 ${depositDeductedAmount.toFixed(2)} 元，请买家确认。`,
  );

  return getLatestConsumptionSettlement(order.id);
}

export async function confirmConsumptionSettlement(params: {
  orderId: string;
  buyerId: string;
  buyerRemark?: string;
}) {
  await ensureOrdersStatusColumnSupportsConsumption();

  const orderRows = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
  const order = orderRows[0];
  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  if (order.buyerId !== params.buyerId) {
    throw new Error('ORDER_CONSUMPTION_FORBIDDEN');
  }

  if (order.status !== 'pending_consumption_confirm') {
    throw new Error('ORDER_STATUS_INVALID_FOR_CONFIRMATION');
  }

  const settlement = await getLatestConsumptionSettlement(order.id);
  if (!settlement || settlement.status !== 'pending_buyer_confirmation') {
    throw new Error('ORDER_CONSUMPTION_SETTLEMENT_NOT_PENDING');
  }

  const now = new Date().toISOString();
  await db
    .update(orderConsumptionSettlements)
    .set({
      status: 'confirmed',
      buyerRemark: params.buyerRemark?.trim() || null,
      buyerConfirmedAt: now,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(orderConsumptionSettlements.id, settlement.id));

  await db
    .update(orders)
    .set({
      status: 'completed',
      verificationResult: 'passed',
      verificationRemark: '买家已确认资源消耗结算单',
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));

  await safeLogFinanceAuditEvent({
    eventType: 'order_consumption_settlement_confirmed',
    status: 'success',
    userId: params.buyerId,
    orderId: order.id,
    amount: toMoney(settlement.depositDeductedAmount),
    details: {
      settlementId: settlement.id,
      approvedAmount: toMoney(settlement.approvedAmount),
      buyerRefundAmount: toMoney(settlement.buyerRefundAmount),
    },
  });

  const splitResult = await settleCompletedOrder(order.id);
  if (!splitResult.success) {
    throw new Error(splitResult.message);
  }

  await sendSettlementSystemMessage(
    order.id,
    `买家已确认资源消耗结算单，订单开始执行最终结算。`,
  );

  return {
    settlement: await getLatestConsumptionSettlement(order.id),
    splitResult,
  };
}

export async function rejectConsumptionSettlement(params: {
  orderId: string;
  buyerId: string;
  buyerRemark?: string;
  evidence?: unknown;
}) {
  await ensureOrdersStatusColumnSupportsConsumption();

  const orderRows = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
  const order = orderRows[0];
  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  if (order.buyerId !== params.buyerId) {
    throw new Error('ORDER_CONSUMPTION_FORBIDDEN');
  }

  if (order.status !== 'pending_consumption_confirm') {
    throw new Error('ORDER_STATUS_INVALID_FOR_CONFIRMATION');
  }

  const settlement = await getLatestConsumptionSettlement(order.id);
  if (!settlement || settlement.status !== 'pending_buyer_confirmation') {
    throw new Error('ORDER_CONSUMPTION_SETTLEMENT_NOT_PENDING');
  }

  const dispute = await createOrderDispute({
    orderId: order.id,
    initiatorId: params.buyerId,
    reason: params.buyerRemark?.trim() || '买家拒绝资源消耗结算，申请平台介入',
    evidence: params.evidence ?? settlement.evidence ?? null,
    disputeType: 'consumption_settlement',
  });

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(orderConsumptionSettlements)
      .set({
        status: 'disputed',
        buyerRemark: params.buyerRemark?.trim() || null,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(orderConsumptionSettlements.id, settlement.id));

    await tx
      .update(orders)
      .set({
        status: 'disputed',
        disputeId: dispute?.id ?? null,
        disputeReason: params.buyerRemark?.trim() || '买家拒绝资源消耗结算',
        disputeEvidence: params.evidence ?? settlement.evidence ?? null,
        verificationResult: 'rejected',
        verificationRemark: '买家拒绝资源消耗结算，已转入争议处理',
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    await safeLogFinanceAuditEvent({
      eventType: 'order_consumption_settlement_rejected',
      status: 'pending',
      userId: params.buyerId,
      orderId: order.id,
      amount: toMoney(settlement.depositDeductedAmount),
      details: {
        settlementId: settlement.id,
        disputeId: dispute?.id ?? null,
      },
    }, tx);
  });

  await sendSettlementSystemMessage(
    order.id,
    `买家已拒绝资源消耗结算单，订单已进入争议处理流程。`,
  );

  return {
    settlement: await getLatestConsumptionSettlement(order.id),
    dispute,
  };
}
