import { NextRequest, NextResponse } from 'next/server';
import {
  createRefundRequest,
  getUserRefundRequests,
  getAllRefundRequests,
  CreateRefundRequestParams
} from '@/lib/refund-service';

/**
 * 获取售后申请列表
 * GET /api/refunds?user_id=xxx&status=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const admin = searchParams.get('admin'); // 是否是管理员请求

    if (admin === 'true') {
      // 管理员获取所有售后申请
      const requests = getAllRefundRequests(status || undefined);
      return NextResponse.json({
        success: true,
        data: requests
      });
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少 user_id 参数'
      }, { status: 400 });
    }

    // 获取用户售后申请
    const requests = getUserRefundRequests(userId, status || undefined);
    return NextResponse.json({
      success: true,
      data: requests
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 创建售后申请
 * POST /api/refunds
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const params: CreateRefundRequestParams = {
      order_id: body.order_id,
      user_id: body.user_id,
      user_type: body.user_type,
      request_type: body.request_type,
      refund_amount: body.refund_amount,
      refund_ratio: body.refund_ratio,
      reason: body.reason,
      evidence_urls: body.evidence_urls
    };

    // 验证必填字段
    if (!params.order_id || !params.user_id || !params.request_type || !params.reason) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段'
      }, { status: 400 });
    }

    const refundRequest = createRefundRequest(params);

    return NextResponse.json({
      success: true,
      message: '售后申请创建成功',
      data: refundRequest
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
