import { NextRequest, NextResponse } from 'next/server';
import {
  decryptWechatPayNotification,
} from '@/lib/wechat/v3';
import {
  markWechatOrderPaid,
  markWechatWalletRechargePaid,
} from '@/lib/wechat/payment-flow';

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
      out_trade_no: string;
      transaction_id: string;
      trade_state: string;
      amount?: {
        total?: number;
      };
      attach?: string;
    }>(rawBody, request.headers);

    if (notification.event_type !== 'TRANSACTION.SUCCESS') {
      return createSuccessResponse();
    }

    const resource = notification.decryptedResource;
    if (resource.trade_state !== 'SUCCESS') {
      return createSuccessResponse();
    }

    let attach: Record<string, any> = {};
    if (resource.attach) {
      try {
        attach = JSON.parse(resource.attach);
      } catch {
        attach = {};
      }
    }

    if (attach.kind === 'wallet_recharge') {
      await markWechatWalletRechargePaid({
        outTradeNo: resource.out_trade_no,
        transactionId: resource.transaction_id,
        totalFeeFen: resource.amount?.total,
      });
    } else {
      await markWechatOrderPaid({
        orderId: attach.orderId || resource.out_trade_no,
        transactionId: resource.transaction_id,
        totalFeeFen: resource.amount?.total,
      });
    }

    return createSuccessResponse();
  } catch (error: any) {
    console.error('[WeChat Pay] 处理 JSAPI 回调失败:', error);
    return createFailResponse(error.message || '处理失败');
  }
}
