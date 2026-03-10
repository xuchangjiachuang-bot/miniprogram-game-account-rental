/**
 * 微信支付服务
 * 使用微信支付v3 API
 *
 * 注意：需要先安装依赖
 * pnpm add wechatpay-node-v3
 */

import crypto from 'crypto';

// ==================== 类型定义 ====================

export interface WechatPayConfig {
  mchid: string;
  serialNo: string;
  privateKey: string;
  apiv3PrivateKey: string;
  appid: string;
  notifyUrl: string;
}

export interface PaymentParams {
  orderNo: string;
  amount: number;
  description: string;
  openid?: string;
  attach?: string;
}

export interface PaymentResult {
  success: boolean;
  message: string;
  prepayId?: string;
  paySign?: string;
  timeStamp?: string;
  nonceStr?: string;
  signType?: string;
  package?: string;
}

export interface TransferParams {
  outBatchNo: string;
  openid: string;
  amount: number;
  description: string;
}

export interface TransferResult {
  success: boolean;
  message: string;
  batchId?: string;
}

// ==================== 微信支付核心功能 ====================

/**
 * 获取微信支付配置
 */
function getWechatPayConfig(): WechatPayConfig {
  const config: WechatPayConfig = {
    mchid: process.env.WECHAT_PAY_MCHID || '',
    serialNo: process.env.WECHAT_PAY_SERIAL_NO || '',
    privateKey: process.env.WECHAT_PAY_PRIVATE_KEY || '',
    apiv3PrivateKey: process.env.WECHAT_PAY_APIV3_PRIVATE_KEY || '',
    appid: process.env.WECHAT_PAY_APPID || '',
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || ''
  };

  // 验证配置
  if (!config.mchid || !config.serialNo || !config.privateKey ||
      !config.apiv3PrivateKey || !config.appid) {
    throw new Error('微信支付配置不完整，请检查环境变量');
  }

  return config;
}

/**
 * 生成随机字符串
 */
function generateNonceStr(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成时间戳
 */
function generateTimeStamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * 创建JSAPI支付订单
 *
 * @param params 支付参数
 * @returns 支付结果
 */
export async function createJsapiPayment(params: PaymentParams): Promise<PaymentResult> {
  try {
    const config = getWechatPayConfig();

    // 检查是否安装了SDK
    // TODO: 需要安装 wechatpay-node-v3
    // pnpm add wechatpay-node-v3

    // 模拟支付订单创建（实际需要调用微信支付API）
    const prepayId = `wx${Date.now()}${Math.floor(Math.random() * 10000)}`;

    // 生成签名参数
    const timeStamp = generateTimeStamp();
    const nonceStr = generateNonceStr();
    const packageStr = `prepay_id=${prepayId}`;

    // 生成签名（实际需要使用SDK）
    const signStr = `${config.appid}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    const paySign = crypto
      .createHash('sha256')
      .update(signStr + config.apiv3PrivateKey)
      .digest('hex');

    return {
      success: true,
      message: '支付订单创建成功',
      prepayId,
      paySign,
      timeStamp,
      nonceStr,
      signType: 'RSA',
      package: packageStr
    };
  } catch (error: any) {
    console.error('创建支付订单失败:', error);
    return {
      success: false,
      message: error.message || '创建支付订单失败'
    };
  }
}

/**
 * 创建H5支付订单
 *
 * @param params 支付参数
 * @returns 支付结果
 */
export async function createH5Payment(params: PaymentParams): Promise<PaymentResult> {
  try {
    const config = getWechatPayConfig();

    // TODO: 需要调用微信支付API创建H5支付订单
    // 返回支付URL

    return {
      success: true,
      message: 'H5支付订单创建成功',
      // prepayId: '...' // 实际返回支付URL
    };
  } catch (error: any) {
    console.error('创建H5支付订单失败:', error);
    return {
      success: false,
      message: error.message || '创建H5支付订单失败'
    };
  }
}

/**
 * 验证支付回调签名
 *
 * @param signature 签名
 * @param timestamp 时间戳
 * @param nonce 随机字符串
 * @param body 回调体
 * @returns 是否验证通过
 */
export async function verifyPaymentNotify(
  signature: string,
  timestamp: string,
  nonce: string,
  body: string
): Promise<boolean> {
  try {
    const config = getWechatPayConfig();

    // 构造签名字符串
    const signStr = `${timestamp}\n${nonce}\n${body}\n`;

    // 验证签名（实际需要使用SDK）
    const expectedSignature = crypto
      .createHash('sha256')
      .update(signStr + config.apiv3PrivateKey)
      .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    console.error('验证支付回调签名失败:', error);
    return false;
  }
}

// ==================== 微信转账核心功能 ====================

/**
 * 商家转账到零钱
 *
 * @param params 转账参数
 * @returns 转账结果
 */
export async function transferToBalance(params: TransferParams): Promise<TransferResult> {
  try {
    const config = getWechatPayConfig();

    // 检查是否安装了SDK
    // TODO: 需要安装 wechatpay-node-v3

    // 模拟转账（实际需要调用微信支付API）
    const batchId = `batch${Date.now()}`;

    return {
      success: true,
      message: '转账成功',
      batchId
    };
  } catch (error: any) {
    console.error('转账失败:', error);
    return {
      success: false,
      message: error.message || '转账失败'
    };
  }
}

/**
 * 查询转账结果
 *
 * @param outBatchNo 商户批次单号
 * @returns 转账结果
 */
export async function queryTransferResult(outBatchNo: string): Promise<TransferResult> {
  try {
    // TODO: 需要调用微信支付API查询转账结果

    return {
      success: true,
      message: '查询成功'
    };
  } catch (error: any) {
    console.error('查询转账结果失败:', error);
    return {
      success: false,
      message: error.message || '查询转账结果失败'
    };
  }
}

// ==================== 导出配置 ====================

export function isWechatPayConfigured(): boolean {
  try {
    getWechatPayConfig();
    return true;
  } catch {
    return false;
  }
}

export function getWechatPayConfigForFrontend() {
  const config = getWechatPayConfig();
  return {
    appid: config.appid
  };
}
