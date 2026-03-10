import path from 'path';
import { getPaymentConfig } from '../payment/config';

export interface WechatPayConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  notifyUrl: string;
  mpAppId?: string;
  mpSecret?: string;
  apiVersion?: 'v2' | 'v3';
  certPath?: string;
  keyPath?: string;
  certP12Path?: string;
  certP12Password?: string;
  certSerialNo?: string;
}

function defaultWechatCertPaths() {
  return {
    certPath: process.env.WECHAT_CERT_PATH || path.join(process.cwd(), 'certs', 'wechat', 'apiclient_cert.pem'),
    keyPath: process.env.WECHAT_KEY_PATH || path.join(process.cwd(), 'certs', 'wechat', 'apiclient_key.pem'),
    certP12Path: process.env.WECHAT_CERT_P12_PATH || path.join(process.cwd(), 'certs', 'wechat', 'apiclient_cert.p12'),
    certP12Password: process.env.WECHAT_CERT_P12_PASSWORD || '',
    certSerialNo: process.env.WECHAT_CERT_SERIAL_NO || '',
  };
}

export async function getWechatPayConfig(): Promise<WechatPayConfig> {
  const [
    appId,
    mchId,
    apiKey,
    notifyUrl,
    mpAppId,
    mpSecret,
    certPath,
    keyPath,
    certP12Path,
    certP12Password,
    certSerialNo,
  ] = await Promise.all([
    getPaymentConfig('wechat', 'appid'),
    getPaymentConfig('wechat', 'mch_id'),
    getPaymentConfig('wechat', 'api_key'),
    getPaymentConfig('wechat', 'notify_url'),
    getPaymentConfig('wechat', 'mp_appid'),
    getPaymentConfig('wechat', 'mp_secret'),
    getPaymentConfig('wechat', 'cert_path'),
    getPaymentConfig('wechat', 'key_path'),
    getPaymentConfig('wechat', 'cert_p12_path'),
    getPaymentConfig('wechat', 'cert_p12_password'),
    getPaymentConfig('wechat', 'cert_serial_no'),
  ]);

  const defaults = defaultWechatCertPaths();

  return {
    appId: appId?.configValue || process.env.WECHAT_APPID || '',
    mchId: mchId?.configValue || process.env.WECHAT_MCH_ID || '',
    apiKey: apiKey?.configValue || process.env.WECHAT_API_KEY || '',
    notifyUrl: notifyUrl?.configValue || process.env.WECHAT_NOTIFY_URL || '',
    mpAppId: mpAppId?.configValue || process.env.WECHAT_MP_APPID || '',
    mpSecret: mpSecret?.configValue || process.env.WECHAT_MP_SECRET || '',
    apiVersion: 'v2',
    certPath: certPath?.configValue || defaults.certPath,
    keyPath: keyPath?.configValue || defaults.keyPath,
    certP12Path: certP12Path?.configValue || defaults.certP12Path,
    certP12Password: certP12Password?.configValue || defaults.certP12Password,
    certSerialNo: certSerialNo?.configValue || defaults.certSerialNo,
  };
}

export async function checkWechatPayConfig(): Promise<{ valid: boolean; missing: string[] }> {
  const config = await getWechatPayConfig();
  const missing: string[] = [];

  if (!config.appId) missing.push('APPID');
  if (!config.mchId) missing.push('商户号(MCH_ID)');
  if (!config.apiKey) missing.push('API 密钥(API_KEY)');
  if (!config.notifyUrl) missing.push('回调地址(NOTIFY_URL)');

  return {
    valid: missing.length === 0,
    missing,
  };
}

export async function checkCertConfig(): Promise<{ valid: boolean; missing: string[] }> {
  const config = await getWechatPayConfig();
  const missing: string[] = [];

  if (!config.certPath) {
    missing.push('证书路径(cert_path)');
  }
  if (!config.keyPath) {
    missing.push('私钥路径(key_path)');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export async function getWechatPayConfigStatus() {
  const config = await getWechatPayConfig();
  const check = await checkWechatPayConfig();
  const certCheck = await checkCertConfig();

  return {
    configured: check.valid,
    missingFields: check.missing,
    certConfigured: certCheck.valid,
    certMissing: certCheck.missing,
    appId: config.appId ? `${config.appId.substring(0, 8)}***` : '未配置',
    mchId: config.mchId ? `${config.mchId.substring(0, 8)}***` : '未配置',
    notifyUrl: config.notifyUrl || '未配置',
    certPath: config.certPath || '未配置',
    keyPath: config.keyPath || '未配置',
  };
}
