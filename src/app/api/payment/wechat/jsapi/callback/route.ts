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

function parseWechatAttach(rawAttach?: string) {
  if (!rawAttach) {
    return {};
  }

  if (rawAttach.startsWith('r:')) {
    return {
      kind: 'wallet_recharge',
      paymentRecordId: rawAttach.slice(2),
    };
  }

  if (rawAttach.startsWith('o:')) {
    return {
      kind: 'order',
      orderId: rawAttach.slice(2),
    };
  }

  try {
    return JSON.parse(rawAttach);
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  console.log('[WeChat Pay] JSAPI callback received', {
    bodyLength: rawBody.length,
    hasWechatSignature: Boolean(request.headers.get('wechatpay-signature')),
    hasWechatTimestamp: Boolean(request.headers.get('wechatpay-timestamp')),
    userAgent: request.headers.get('user-agent'),
  });

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
    console.log('[WeChat Pay] JSAPI callback decrypted', {
      eventType: notification.event_type,
      outTradeNo: resource.out_trade_no,
      transactionId: resource.transaction_id,
      tradeState: resource.trade_state,
      attach: resource.attach,
      totalFeeFen: resource.amount?.total,
    });
    if (resource.trade_state !== 'SUCCESS') {
      return createSuccessResponse();
    }

    const attach = parseWechatAttach(resource.attach);
    console.log('[WeChat Pay] JSAPI callback resolved attach', attach);

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

    console.log('[WeChat Pay] JSAPI callback processed successfully', {
      outTradeNo: resource.out_trade_no,
      transactionId: resource.transaction_id,
      kind: attach.kind || 'order',
    });

    return createSuccessResponse();
  } catch (error: any) {
    console.error('[WeChat Pay] 处理 JSAPI 回调失败:', error);
    return createFailResponse(error.message || '处理失败');
  }
}
