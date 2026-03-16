import { NextRequest, NextResponse } from 'next/server';
import {
  confirmConsumptionSettlement,
  rejectConsumptionSettlement,
} from '@/lib/order-consumption-service';
import { getServerUserId } from '@/lib/server-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'confirm') {
      const result = await confirmConsumptionSettlement({
        orderId: id,
        buyerId: userId,
        buyerRemark: typeof body.buyerRemark === 'string' ? body.buyerRemark : '',
      });

      return NextResponse.json({
        success: true,
        message: result.splitResult.pendingRefund
          ? '买家已确认资源消耗结算，押金退款处理中'
          : '买家已确认资源消耗结算，订单已进入最终结算',
        data: result,
      });
    }

    if (action === 'reject') {
      const result = await rejectConsumptionSettlement({
        orderId: id,
        buyerId: userId,
        buyerRemark: typeof body.buyerRemark === 'string' ? body.buyerRemark : '',
        evidence: body.evidence ?? null,
      });

      return NextResponse.json({
        success: true,
        message: '买家已拒绝资源消耗结算，订单已转入争议处理',
        data: result,
      });
    }

    return NextResponse.json({ success: false, error: '不支持的操作' }, { status: 400 });
  } catch (error: any) {
    const message = error.message || '处理资源消耗结算失败';
    const status =
      [
        'ORDER_NOT_FOUND',
        'ORDER_CONSUMPTION_FORBIDDEN',
        'ORDER_STATUS_INVALID_FOR_CONFIRMATION',
        'ORDER_CONSUMPTION_SETTLEMENT_NOT_PENDING',
      ].includes(message) ? 400 : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
