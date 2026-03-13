import { NextRequest, NextResponse } from 'next/server';
import { executeAutoSplit, getSplitStatus } from '@/lib/platform-split-service';

/**
 * Manual split trigger kept for compatibility, but now uses the same
 * settlement implementation as verification and scheduled expiry handling.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await executeAutoSplit(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSplitStatus(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
