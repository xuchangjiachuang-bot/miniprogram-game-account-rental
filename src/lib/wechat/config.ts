import { assertWechatPayV3Config, getWechatPayV3Config } from '@/lib/wechat/v3';

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

function maskValue(value: string) {
  if (!value) return 'Not configured';
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 6)}***${value.slice(-2)}`;
}

function mapMissingField(field: string) {
  switch (field) {
    case 'mchid':
      return 'Merchant ID (MCHID)';
    case 'appid':
      return 'Payment AppID';
    case 'notifyUrl':
      return 'Notify URL';
    case 'apiV3Key':
      return 'API v3 Key';
    case 'serialNo':
      return 'Merchant Certificate Serial No';
    case 'privateKey':
      return 'Merchant Private Key';
    default:
      return field;
  }
}

export async function getWechatPayConfig(): Promise<WechatPayConfig> {
  const config = await getWechatPayV3Config();

  return {
    appId: config.appid,
    mchId: config.mchid,
    apiKey: config.apiV3Key,
    notifyUrl: config.notifyUrl,
    mpAppId: config.mpAppId,
    mpSecret: config.mpSecret,
    apiVersion: 'v3',
    certSerialNo: config.serialNo,
  };
}

export async function checkWechatPayConfig(): Promise<{ valid: boolean; missing: string[] }> {
  const result = await assertWechatPayV3Config();
  return {
    valid: result.valid,
    missing: result.missing.map(mapMissingField),
  };
}

export async function checkCertConfig(): Promise<{ valid: boolean; missing: string[] }> {
  const result = await assertWechatPayV3Config(['serialNo', 'privateKey']);
  return {
    valid: result.valid,
    missing: result.missing.map(mapMissingField),
  };
}

export async function getWechatPayConfigStatus() {
  const config = await getWechatPayV3Config();
  const check = await checkWechatPayConfig();
  const certCheck = await checkCertConfig();
  const appIdMatch = Boolean(config.appid && config.mpAppId && config.appid === config.mpAppId);

  return {
    configured: check.valid,
    missingFields: check.missing,
    certConfigured: certCheck.valid,
    certMissing: certCheck.missing,
    appId: maskValue(config.appid),
    mpAppId: maskValue(config.mpAppId),
    appIdMatch,
    mchId: maskValue(config.mchid),
    notifyUrl: config.notifyUrl || 'Not configured',
    certPath: 'Using environment variable private key',
    keyPath: 'Using environment variable private key',
    apiVersion: 'v3',
    transferConfigured: Boolean(config.transferSceneId),
  };
}
