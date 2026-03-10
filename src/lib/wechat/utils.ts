import crypto from 'crypto';

/**
 * 微信支付工具类
 */

/**
 * 生成随机字符串
 */
export function generateNonceStr(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 对象转 XML
 */
export function objectToXML(obj: any): string {
  let xml = '<xml>';
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      xml += `<${key}>${obj[key]}</${key}>`;
    }
  }
  xml += '</xml>';
  return xml;
}

/**
 * XML 转对象
 */
export function xmlToObject(xml: string): any {
  const result: any = {};
  const regex = /<(\w+)>([^<]*)<\/\1>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const [, key, value] = match;
    result[key] = value;
  }

  return result;
}

/**
 * 生成签名（MD5）
 */
export function generateSign(params: any, apiKey: string): string {
  // 1. 过滤空值和 sign 字段
  const filteredParams: any = {};
  for (const key in params) {
    if (params.hasOwnProperty(key) && params[key] !== '' && params[key] !== null && params[key] !== undefined && key !== 'sign') {
      filteredParams[key] = params[key];
    }
  }

  // 2. 按字典序排序
  const sortedKeys = Object.keys(filteredParams).sort();

  // 3. 拼接字符串
  let stringA = '';
  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    stringA += `${key}=${filteredParams[key]}`;
    if (i < sortedKeys.length - 1) {
      stringA += '&';
    }
  }

  // 4. 拼接 API 密钥
  const stringSignTemp = `${stringA}&key=${apiKey}`;

  // 5. MD5 加密并转为大写
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
}

/**
 * 验证签名
 */
export function verifySign(params: any, apiKey: string): boolean {
  const sign = params.sign;
  const calculatedSign = generateSign(params, apiKey);
  return sign === calculatedSign;
}

/**
 * 生成时间戳（秒）
 */
export function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * 金额转分（元 -> 分）
 */
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100);
}

/**
 * 分转元（分 -> 元）
 * 返回字符串格式以兼容 Drizzle ORM 的 numeric 类型
 */
export function fenToYuan(fen: number): string {
  return (fen / 100).toFixed(2);
}
