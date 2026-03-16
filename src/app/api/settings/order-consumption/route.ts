import { NextResponse } from 'next/server';
import { getOrderConsumptionCatalog } from '@/lib/order-consumption-config';

export async function GET() {
  try {
    const catalog = await getOrderConsumptionCatalog();

    return NextResponse.json({
      success: true,
      data: {
        catalog,
      },
    });
  } catch (error: any) {
    console.error('获取资源消耗模板失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取资源消耗模板失败',
      },
      { status: 500 },
    );
  }
}
