import { NextRequest, NextResponse } from 'next/server';
import { getServerToken } from '@/lib/server-auth';
import { verifyToken } from '@/lib/user-service';
import { reconcileWechatWalletRechargeStatus } from '@/lib/wechat/payment-flow';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getServerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '登录状态已失效，请重新登录' },
        { status: 401 }
      );
    }

    const { id } = await params;
    console.log('[Recharge Status] reconciling recharge status', {
      paymentRecordId: id,
      userId: user.id,
    });
    const record = await reconcileWechatWalletRechargeStatus({
      paymentRecordId: id,
      userId: user.id,
    });

    console.log('[Recharge Status] recharge status resolved', {
      paymentRecordId: record.id,
      status: record.status,
      transactionId: record.transactionId,
      failureReason: record.failureReason,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        amount: Number(record.amount) || 0,
        status: record.status,
        transactionId: record.transactionId,
        failureReason: record.failureReason,
        createdAt: record.createdAt,
      },
    });
  } catch (error: any) {
    if (error.message === 'RECHARGE_RECORD_NOT_FOUND') {
      return NextResponse.json({ success: false, error: '充值记录不存在' }, { status: 404 });
    }

    console.error('[Recharge Status] Failed to query recharge status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '查询充值状态失败',
      },
      { status: 500 }
    );
  }
}
