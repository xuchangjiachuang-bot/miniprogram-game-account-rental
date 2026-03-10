import { NextRequest, NextResponse } from 'next/server';
import { getListingDepositAmount } from '@/lib/account-deposit-service';

/**
 * 获取平台配置的上架保证金金额
 * GET /api/settings/listing-deposit
 */
export async function GET(request: NextRequest) {
  try {
    const amount = await getListingDepositAmount();

    return NextResponse.json({
      success: true,
      data: {
        amount
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
