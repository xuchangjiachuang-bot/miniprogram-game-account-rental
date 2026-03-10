import { objectToXML, xmlToObject, generateSign, generateNonceStr, yuanToFen } from './utils';
import { getWechatPayConfig } from './config';
import fs from 'fs';
import https from 'https';

const REFUND_URL = 'https://api.mch.weixin.qq.com/secapi/pay/refund';

export interface RefundParams {
  transactionId?: string; // 微信交易号
  outTradeNo: string; // 商户订单号
  outRefundNo: string; // 商户退款单号
  totalFee: number; // 订单总金额（分）
  refundFee: number; // 退款金额（分）
  refundDesc: string; // 退款原因
}

export interface RefundResult {
  returnCode: string;
  returnMsg: string;
  appId?: string;
  mchId?: string;
  nonceStr?: string;
  sign?: string;
  resultCode?: string;
  errCode?: string;
  errCodeDes?: string;
  transactionId?: string;
  outTradeNo?: string;
  outRefundNo?: string;
  refundId?: string;
  refundFee?: number;
  totalFee?: number;
}

/**
 * 退款
 * 需要商户证书
 */
export async function refund(params: RefundParams): Promise<RefundResult> {
  const config = await getWechatPayConfig();

  // 检查证书文件是否存在
  if (!config.certPath || !config.keyPath) {
    throw new Error('微信支付证书未配置，无法进行退款操作');
  }

  // 构建请求参数
  const requestParams: any = {
    appid: config.appId,
    mch_id: config.mchId,
    nonce_str: generateNonceStr(),
    transaction_id: params.transactionId,
    out_trade_no: params.outTradeNo,
    out_refund_no: params.outRefundNo,
    total_fee: params.totalFee,
    refund_fee: params.refundFee,
    refund_desc: params.refundDesc,
    notify_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://hfb.yugioh.top'}/api/payment/wechat/refund/callback`,
  };

  // 生成签名
  requestParams.sign = generateSign(requestParams, config.apiKey);

  // 转换为 XML
  const xmlData = objectToXML(requestParams);

  console.log('[WeChat Pay] 退款请求参数:', requestParams);

  try {
    // 使用 HTTPS 发送请求（带证书）
    const result = await new Promise<RefundResult>((resolve, reject) => {
      const options = {
        hostname: 'api.mch.weixin.qq.com',
        port: 443,
        path: '/secapi/pay/refund',
        method: 'POST',
        key: fs.readFileSync(config.keyPath!),
        cert: fs.readFileSync(config.certPath!),
        headers: {
          'Content-Type': 'application/xml',
          'Content-Length': Buffer.byteLength(xmlData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          console.log('[WeChat Pay] 退款响应:', data);
          const result = xmlToObject(data) as RefundResult;
          resolve(result);
        });
      });

      req.on('error', (error) => {
        console.error('[WeChat Pay] 退款请求失败:', error);
        reject(error);
      });

      req.write(xmlData);
      req.end();
    });

    if (result.returnCode !== 'SUCCESS') {
      throw new Error(`微信退款失败: ${result.returnMsg}`);
    }

    if (result.resultCode !== 'SUCCESS') {
      throw new Error(`微信退款失败: ${result.errCodeDes} (${result.errCode})`);
    }

    return result;
  } catch (error: any) {
    console.error('[WeChat Pay] 退款异常:', error);
    throw error;
  }
}
