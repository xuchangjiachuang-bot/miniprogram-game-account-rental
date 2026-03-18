import { NextRequest, NextResponse } from 'next/server';
import { getLatestConsumptionSettlement, submitConsumptionSettlement } from '@/lib/order-consumption-service';
import { getServerUserId } from '@/lib/server-auth';
import { ensureDatabaseInitialized } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabaseInitialized();
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const settlement = await getLatestConsumptionSettlement(id);

    return NextResponse.json({
      success: true,
      data: settlement,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取资源消耗结算单失败' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabaseInitialized();
    const userId = getServerUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const settlement = await submitConsumptionSettlement({
      orderId: id,
      sellerId: userId,
      items: Array.isArray(body.items) ? body.items : [],
      sellerRemark: typeof body.sellerRemark === 'string' ? body.sellerRemark : '',
      evidence: body.evidence ?? null,
      offlineSettledAmount: Number(body.offlineSettledAmount || 0),
    });

    return NextResponse.json({
      success: true,
      message: '资源消耗结算单已提交，等待买家确认',
      data: settlement,
    });
  } catch (error: any) {
    const message = error.message || '提交资源消耗结算单失败';
    const status =
      [
        'ORDER_NOT_FOUND',
        'ORDER_CONSUMPTION_FORBIDDEN',
        'ORDER_STATUS_INVALID_FOR_CONSUMPTION',
        'ORDER_ALREADY_SETTLED',
        'ORDER_CONSUMPTION_ITEMS_EMPTY',
        'ORDER_CONSUMPTION_PENDING_CONFIRMATION',
      ].includes(message) ? 400 : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
