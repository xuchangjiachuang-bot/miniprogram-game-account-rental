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
  callbackVerificationMode?: 'public_key' | 'platform_certificate' | 'unknown';
  publicKeyId?: string;
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
    callbackVerificationMode: config.publicKey ? 'public_key' : 'platform_certificate',
    publicKeyId: config.publicKeyId,
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

export async function checkCallbackVerificationConfig(): Promise<{ valid: boolean; missing: string[]; mode: 'public_key' | 'platform_certificate' }> {
  const config = await getWechatPayV3Config();

  if (config.publicKey) {
    const missing = [];
    if (!config.publicKeyId) {
      missing.push('Wechat Pay Public Key ID');
    }

    return {
      valid: missing.length === 0,
      missing,
      mode: 'public_key',
    };
  }

  return {
    valid: true,
    missing: [],
    mode: 'platform_certificate',
  };
}

export async function getWechatPayConfigStatus() {
  const config = await getWechatPayV3Config();
  const check = await checkWechatPayConfig();
  const certCheck = await checkCertConfig();
  const callbackCheck = await checkCallbackVerificationConfig();
  const appIdMatch = Boolean(config.appid && config.mpAppId && config.appid === config.mpAppId);

  return {
    configured: check.valid,
    missingFields: check.missing,
    certConfigured: certCheck.valid,
    certMissing: certCheck.missing,
    callbackVerificationConfigured: callbackCheck.valid,
    callbackVerificationMissing: callbackCheck.missing,
    callbackVerificationMode: callbackCheck.mode,
    appId: maskValue(config.appid),
    mpAppId: maskValue(config.mpAppId),
    appIdMatch,
    mchId: maskValue(config.mchid),
    notifyUrl: config.notifyUrl || 'Not configured',
    certPath: 'Using environment variable private key',
    keyPath: 'Using environment variable private key',
    apiVersion: 'v3',
    transferConfigured: Boolean(config.transferSceneId),
    publicKeyId: maskValue(config.publicKeyId),
  };
}
