import { NextRequest, NextResponse } from 'next/server';
import { executeAutoSplit, getOrderSplitRecords } from '@/lib/auto-split-service';

/**
 * 自动触发订单分账
 * POST /api/orders/[id]/auto-split
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 执行自动分账
    const result = await executeAutoSplit(id);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 获取订单分账记录
 * GET /api/orders/[id]/auto-split
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取分账记录
    const result = await getOrderSplitRecords(id);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
