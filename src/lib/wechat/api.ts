import { getWechatPayConfig } from './config';
import { objectToXML, xmlToObject, generateSign, generateNonceStr, generateTimestamp, yuanToFen } from './utils';

/**
 * 微信支付 API 客户端
 */

const API_URL = 'https://api.mch.weixin.qq.com/pay/unifiedorder';

export interface UnifiedOrderParams {
  openid: string;
  body: string;
  outTradeNo: string;
  totalFee: number; // 单位：分
  spbillCreateIp: string;
  notifyUrl: string;
  tradeType: 'JSAPI';
}

export interface UnifiedOrderResult {
  returnCode: string;
  returnMsg: string;
  appId?: string;
  mchId?: string;
  nonceStr?: string;
  sign?: string;
  resultCode?: string;
  errCode?: string;
  errCodeDes?: string;
  tradeType?: string;
  prepayId?: string;
}

/**
 * 统一下单
 */
export async function unifiedOrder(params: UnifiedOrderParams): Promise<UnifiedOrderResult> {
  const config = await getWechatPayConfig();

  // 构建请求参数
  const requestParams: any = {
    appid: config.appId,
    mch_id: config.mchId,
    nonce_str: generateNonceStr(),
    body: params.body,
    out_trade_no: params.outTradeNo,
    total_fee: params.totalFee,
    spbill_create_ip: params.spbillCreateIp,
    notify_url: params.notifyUrl,
    trade_type: params.tradeType,
    openid: params.openid,
  };

  // 生成签名
  requestParams.sign = generateSign(requestParams, config.apiKey);

  // 转换为 XML
  const xmlData = objectToXML(requestParams);

  console.log('[WeChat Pay] 统一下单请求参数:', requestParams);

  try {
    // 发送请求
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
      },
      body: xmlData,
    });

    const responseText = await response.text();
    console.log('[WeChat Pay] 统一下单响应:', responseText);

    // 解析 XML 响应
    const result = xmlToObject(responseText) as UnifiedOrderResult;

    if (result.returnCode !== 'SUCCESS') {
      throw new Error(`微信支付统一下单失败: ${result.returnMsg}`);
    }

    if (result.resultCode !== 'SUCCESS') {
      throw new Error(`微信支付统一下单失败: ${result.errCodeDes} (${result.errCode})`);
    }

    return result;
  } catch (error: any) {
    console.error('[WeChat Pay] 统一下单异常:', error);
    throw error;
  }
}

/**
 * 生成 JSAPI 支付参数
 */
export interface JSAPIPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

export async function generateJSAPIPayParams(prepayId: string, apiKey: string): Promise<JSAPIPayParams> {
  const config = await getWechatPayConfig();
  const nonceStr = generateNonceStr();
  const timestamp = generateTimestamp();
  const pkg = `prepay_id=${prepayId}`;

  // 构建签名参数
  const signParams = {
    appId: config.appId,
    timeStamp: timestamp,
    nonceStr,
    package: pkg,
    signType: 'MD5',
  };

  // 生成签名
  const paySign = generateSign(signParams, apiKey);

  return {
    appId: config.appId,
    timeStamp: timestamp,
    nonceStr,
    package: pkg,
    signType: 'MD5',
    paySign,
  };
}
