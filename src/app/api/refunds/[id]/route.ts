import { NextRequest, NextResponse } from 'next/server';
import { getRefundRequest, approveRefundRequest, rejectRefundRequest } from '@/lib/refund-service';

/**
 * 获取售后申请详情
 * GET /api/refunds/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const refundRequest = getRefundRequest(id);

    if (!refundRequest) {
      return NextResponse.json({
        success: false,
        error: '售后申请不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: refundRequest
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 审核售后申请
 * POST /api/refunds/[id]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    if (action === 'approve') {
      // 批准售后申请
      const result = approveRefundRequest({
        refund_request_id: id,
        admin_id: body.admin_id,
        admin_remark: body.admin_remark
      });
      return NextResponse.json(result);
    } else if (action === 'reject') {
      // 拒绝售后申请
      const result = rejectRefundRequest({
        refund_request_id: id,
        admin_id: body.admin_id,
        admin_remark: body.admin_remark
      });
      return NextResponse.json(result);
    } else {
      return NextResponse.json({
        success: false,
        error: '未知的操作'
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
