import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy mock refunds API has been retired.
 * Real after-sale/refund handling should go through the payment/dispute flow.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({
    success: false,
    error: 'Legacy refunds API has been removed. Use the real payment refund and dispute workflow instead.',
  }, { status: 410 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({
    success: false,
    error: 'Legacy refunds API has been removed. Use the real payment refund and dispute workflow instead.',
  }, { status: 410 });
}
