import { NextRequest, NextResponse } from 'next/server';
import { getWechatPayConfig } from '@/lib/wechat/config';
import { objectToXML, verifySign, xmlToObject } from '@/lib/wechat/utils';
import { markWechatOrderPaid } from '@/lib/wechat/payment-flow';

function createXmlResponse(payload: Record<string, string>) {
  return new NextResponse(objectToXML(payload), {
    headers: { 'Content-Type': 'application/xml' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const callbackData = xmlToObject(body);
    const config = await getWechatPayConfig();

    if (!verifySign(callbackData, config.apiKey)) {
      return createXmlResponse({
        return_code: 'FAIL',
        return_msg: '签名验证失败',
      });
    }

    if (callbackData.return_code !== 'SUCCESS') {
      return createXmlResponse({
        return_code: 'FAIL',
        return_msg: callbackData.return_msg || '回调失败',
      });
    }

    if (callbackData.result_code !== 'SUCCESS') {
      return createXmlResponse({
        return_code: 'FAIL',
        return_msg: callbackData.err_code_des || '支付失败',
      });
    }

    await markWechatOrderPaid({
      orderId: callbackData.out_trade_no,
      transactionId: callbackData.transaction_id,
      totalFeeFen: Number.parseInt(callbackData.total_fee || '0', 10),
    });

    return createXmlResponse({
      return_code: 'SUCCESS',
      return_msg: 'OK',
    });
  } catch (error: any) {
    console.error('[WeChat Pay] 处理 JSAPI 回调失败:', error);

    const returnMsg = error.message === 'ORDER_NOT_FOUND'
      ? '订单不存在'
      : error.message === 'PAYMENT_AMOUNT_MISMATCH'
        ? '支付金额不匹配'
        : '处理失败';

    return createXmlResponse({
      return_code: 'FAIL',
      return_msg: returnMsg,
    });
  }
}
