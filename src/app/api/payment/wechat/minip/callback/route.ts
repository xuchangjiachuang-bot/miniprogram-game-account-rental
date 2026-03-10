import { NextRequest, NextResponse } from 'next/server';
import { getWechatPayConfig } from '@/lib/wechat/config';
import { objectToXML, verifySign, xmlToObject } from '@/lib/wechat/utils';
import { markWechatOrderPaid } from '@/lib/wechat/payment-flow';

function createXmlResponse(payload: Record<string, string>) {
  return new NextResponse(objectToXML(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = xmlToObject(body) as Record<string, string>;
    const config = await getWechatPayConfig();

    if (!verifySign(data, config.apiKey)) {
      return createXmlResponse({
        return_code: 'FAIL',
        return_msg: '签名验证失败',
      });
    }

    if (data.return_code !== 'SUCCESS') {
      return createXmlResponse({
        return_code: 'FAIL',
        return_msg: data.return_msg || '回调失败',
      });
    }

    if (data.result_code !== 'SUCCESS') {
      return createXmlResponse({
        return_code: 'SUCCESS',
        return_msg: 'OK',
      });
    }

    await markWechatOrderPaid({
      orderId: data.out_trade_no,
      transactionId: data.transaction_id,
      totalFeeFen: Number.parseInt(data.total_fee || '0', 10),
    });

    return createXmlResponse({
      return_code: 'SUCCESS',
      return_msg: 'OK',
    });
  } catch (error: any) {
    console.error('[WeChat Pay] 处理小程序回调失败:', error);

    const returnMsg = error.message === 'ORDER_NOT_FOUND'
      ? '订单不存在'
      : error.message === 'PAYMENT_AMOUNT_MISMATCH'
        ? '支付金额不匹配'
        : '服务器错误';

    return createXmlResponse({
      return_code: 'FAIL',
      return_msg: returnMsg,
    });
  }
}
