import { NextRequest, NextResponse } from 'next/server';
import { db, paymentRecords, orders, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { xmlToObject, objectToXML, verifySign, fenToYuan } from '@/lib/wechat/utils';
import { getWechatPayConfig } from '@/lib/wechat/config';

/**
 * 微信退款回调处理
 * POST /api/payment/wechat/refund/callback
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[WeChat Pay] 收到退款回调');

    // 1. 获取回调数据
    const body = await request.text();
    console.log('[WeChat Pay] 退款回调数据:', body);

    // 2. 解析 XML
    const callbackData = xmlToObject(body);
    console.log('[WeChat Pay] 解析后的数据:', callbackData);

    // 3. 获取配置
    const config = await getWechatPayConfig();

    // 4. 验证签名
    const isValidSign = verifySign(callbackData, config.apiKey);
    if (!isValidSign) {
      console.error('[WeChat Pay] 退款回调签名验证失败');
      return new NextResponse(objectToXML({
        return_code: 'FAIL',
        return_msg: '签名验证失败',
      }), {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    // 5. 检查返回码
    if (callbackData.return_code !== 'SUCCESS') {
      console.error('[WeChat Pay] 退款回调失败:', callbackData.return_msg);
      return new NextResponse(objectToXML({
        return_code: 'FAIL',
        return_msg: callbackData.return_msg,
      }), {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    // 5. 获取退款信息
    const outRefundNo = callbackData.out_refund_no; // 商户退款单号
    const transactionId = callbackData.transaction_id; // 微信交易号
    const refundId = callbackData.refund_id; // 微信退款单号
    const refundStatus = callbackData.refund_status; // 退款状态：SUCCESS-退款成功、FAIL-退款失败、PROCESSING-退款处理中、CHANGE-退款异常
    const refundFee = parseInt(callbackData.refund_fee); // 退款金额（分）
    const refundRecvAccount = callbackData.refund_recv_account; // 退款入账账户

    console.log('[WeChat Pay] 退款信息:', {
      outRefundNo,
      transactionId,
      refundId,
      refundStatus,
      refundFee: fenToYuan(refundFee),
      refundRecvAccount,
    });

    // 6. 查询退款记录（使用paymentRecords，type为refund）
    const refundRecordList = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.thirdPartyOrderId, outRefundNo)) // thirdPartyOrderId用于存储退款单号
      .limit(1);

    if (refundRecordList.length === 0) {
      console.error('[WeChat Pay] 退款记录不存在:', outRefundNo);
      return new NextResponse(objectToXML({
        return_code: 'FAIL',
        return_msg: '退款记录不存在',
      }), {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    const refundRecord = refundRecordList[0];

    // 7. 检查退款状态（避免重复处理）
    if (refundRecord.status === 'success' || refundRecord.status === 'failed') {
      console.log('[WeChat Pay] 退款已处理，跳过');
      return new NextResponse(objectToXML({
        return_code: 'SUCCESS',
        return_msg: 'OK',
      }), {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    // 8. 更新退款记录状态
    let status = 'processing';
    if (refundStatus === 'SUCCESS') {
      status = 'success';
    } else if (refundStatus === 'FAIL') {
      status = 'failed';
    } else if (refundStatus === 'CHANGE') {
      status = 'exception';
    }

    await db
      .update(paymentRecords)
      .set({
        status: status,
        transactionId: refundId, // 使用transactionId字段存储微信退款单号
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentRecords.id, refundRecord.id));

    console.log('[WeChat Pay] 退款记录状态已更新:', status);

    // 9. 如果退款成功，更新订单状态
    if (status === 'success') {
      // 查询订单信息
      const orderList = await db
        .select()
        .from(orders)
        .where(eq(orders.id, refundRecord.orderId))
        .limit(1);

      if (orderList.length > 0) {
        const order = orderList[0];

        // 更新订单状态
        await db
          .update(orders)
          .set({
            status: 'refunded',
            updatedAt: new Date().toISOString(),
          })
          .where(eq(orders.id, order.id));

        console.log('[WeChat Pay] 订单状态已更新为已退款:', order.id);
      }
    }

    // 10. 返回成功响应
    return new NextResponse(objectToXML({
      return_code: 'SUCCESS',
      return_msg: 'OK',
    }), {
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error: any) {
    console.error('[WeChat Pay] 处理退款回调失败:', error);
    return new NextResponse(objectToXML({
      return_code: 'FAIL',
      return_msg: '处理失败',
    }), {
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
