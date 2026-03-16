import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders } from '@/lib/db';
import { getLatestConsumptionSettlement } from '@/lib/order-consumption-service';
import { getOrderDispute } from '@/lib/dispute-service';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;

    const orderList = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (orderList.length === 0) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    const order = orderList[0];
    const dispute = await getOrderDispute(order.id);
    const consumptionSettlement = await getLatestConsumptionSettlement(order.id);

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        dispute,
        consumptionSettlement,
      },
    });
  } catch (error: any) {
    console.error('获取订单详情失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取订单详情失败' },
      { status: 500 },
    );
  }
}
