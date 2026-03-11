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
    missing: result.missing.map((field) => {
      switch (field) {
        case 'mchid':
          return '商户号(MCHID)';
        case 'appid':
          return '支付 AppID(APPID)';
        case 'notifyUrl':
          return '支付回调地址(NOTIFY_URL)';
        case 'apiV3Key':
          return 'APIv3 密钥(API_V3_KEY)';
        case 'serialNo':
          return '商户证书序列号(SERIAL_NO)';
        case 'privateKey':
          return '商户私钥(PRIVATE_KEY)';
        default:
          return field;
      }
    }),
  };
}

export async function checkCertConfig(): Promise<{ valid: boolean; missing: string[] }> {
  const result = await assertWechatPayV3Config(['serialNo', 'privateKey']);
  return {
    valid: result.valid,
    missing: result.missing.map((field) => {
      switch (field) {
        case 'serialNo':
          return '商户证书序列号(SERIAL_NO)';
        case 'privateKey':
          return '商户私钥(PRIVATE_KEY)';
        default:
          return field;
      }
    }),
  };
}

export async function getWechatPayConfigStatus() {
  const config = await getWechatPayV3Config();
  const check = await checkWechatPayConfig();
  const certCheck = await checkCertConfig();

  return {
    configured: check.valid,
    missingFields: check.missing,
    certConfigured: certCheck.valid,
    certMissing: certCheck.missing,
    appId: config.appid ? `${config.appid.slice(0, 8)}***` : '未配置',
    mchId: config.mchid ? `${config.mchid.slice(0, 8)}***` : '未配置',
    notifyUrl: config.notifyUrl || '未配置',
    certPath: '使用环境变量商户私钥',
    keyPath: '使用环境变量商户私钥',
    apiVersion: 'v3',
    transferConfigured: Boolean(config.transferSceneId),
  };
}
