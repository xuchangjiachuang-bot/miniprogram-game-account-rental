import { eq } from 'drizzle-orm';
import { db, orders } from '@/lib/db';
import { getApprovedConsumptionSummary } from '@/lib/order-consumption-service';
import { executeAutoSplit } from '@/lib/platform-split-service';

export interface SettlementResult {
  success: boolean;
  message: string;
  settled: boolean;
  pendingRefund: boolean;
  platformCommission: number;
  sellerIncome: number;
  buyerRefund: number;
}

export async function settleCompletedOrder(orderId: string): Promise<SettlementResult> {
  try {
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    const order = orderRows[0];
    if (!order) {
      return {
        success: false,
        message: 'ORDER_NOT_FOUND',
        settled: false,
        pendingRefund: false,
        platformCommission: 0,
        sellerIncome: 0,
        buyerRefund: 0,
      };
    }

    if (order.isSettled) {
      const settledConsumptionSummary = await getApprovedConsumptionSummary(order.id);
      return {
        success: true,
        message: 'ORDER_ALREADY_SETTLED',
        settled: true,
        pendingRefund: false,
        platformCommission: Number(order.platformFee) || 0,
        sellerIncome: Number(order.sellerIncome) || 0,
        buyerRefund: Math.max(0, (Number(order.deposit) || 0) - (settledConsumptionSummary.depositDeductedAmount || 0)),
      };
    }

    const consumptionSummary = await getApprovedConsumptionSummary(order.id);
    const splitResult = await executeAutoSplit(orderId);
    return {
      ...splitResult,
      settled: splitResult.success,
      pendingRefund: false,
      buyerRefund: splitResult.success
        ? Math.max(0, (Number(order.deposit) || 0) - (consumptionSummary.depositDeductedAmount || 0))
        : 0,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'ORDER_SETTLEMENT_FAILED',
      settled: false,
      pendingRefund: false,
      platformCommission: 0,
      sellerIncome: 0,
      buyerRefund: 0,
    };
  }
}
