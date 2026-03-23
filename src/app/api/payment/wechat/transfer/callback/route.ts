import { NextRequest, NextResponse } from 'next/server';
import { handleWithdrawalTransferNotification } from '@/lib/withdrawal-service';
import { decryptWechatPayNotification } from '@/lib/wechat/v3';

function createSuccessResponse() {
  return NextResponse.json({ code: 'SUCCESS', message: '成功' });
}

function createFailResponse(message: string, status = 500) {
  return NextResponse.json({ code: 'FAIL', message }, { status });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  try {
    const notification = await decryptWechatPayNotification<{
      out_bill_no?: string;
      transfer_bill_no?: string;
      state?: string;
      fail_reason?: string;
      package_info?: string;
      update_time?: string;
    }>(rawBody, request.headers);

    const resource = notification.decryptedResource || {};
    if (!resource.out_bill_no) {
      throw new Error('WITHDRAWAL_OUT_BILL_NO_MISSING');
    }

    await handleWithdrawalTransferNotification({
      outBillNo: resource.out_bill_no,
      transferBillNo: resource.transfer_bill_no,
      transferState: resource.state,
      failReason: resource.fail_reason,
      packageInfo: resource.package_info,
      updateTime: resource.update_time,
    });

    return createSuccessResponse();
  } catch (error: any) {
    console.error('[WeChat Transfer] callback failed:', error);
    return createFailResponse(error.message || '处理失败');
  }
}
