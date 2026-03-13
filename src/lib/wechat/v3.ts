import crypto from 'crypto';

const WECHAT_PAY_API_HOST = 'https://api.mch.weixin.qq.com';
const WECHAT_PAY_SCHEMA = 'WECHATPAY2-SHA256-RSA2048';

export interface WechatPayV3Config {
  mchid: string;
  appid: string;
  mpAppId: string;
  mpSecret: string;
  notifyUrl: string;
  apiV3Key: string;
  serialNo: string;
  privateKey: string;
  transferSceneId: string;
  transferSceneInfoType: string;
  transferSceneInfoContent: string;
}

export interface WechatPlatformCertificate {
  serialNo: string;
  certificatePem: string;
}

export interface CreateJsapiTransactionParams {
  appid?: string;
  description: string;
  outTradeNo: string;
  totalFeeFen: number;
  payerOpenid: string;
  notifyUrl?: string;
  attach?: string;
  payerClientIp?: string;
}

export interface CreateH5TransactionParams {
  appid?: string;
  description: string;
  outTradeNo: string;
  totalFeeFen: number;
  notifyUrl?: string;
  attach?: string;
  payerClientIp?: string;
  h5Type?: 'Wap' | 'iOS' | 'Android';
  appName?: string;
  appUrl?: string;
}

export interface CreateNativeTransactionParams {
  appid?: string;
  description: string;
  outTradeNo: string;
  totalFeeFen: number;
  notifyUrl?: string;
  attach?: string;
}

export interface CreateTransferBillParams {
  appid?: string;
  outBillNo: string;
  openid: string;
  transferAmountFen: number;
  transferRemark: string;
  notifyUrl?: string;
  userName?: string;
  userRecvPerception?: string;
}

export interface WechatPayTransactionResult {
  appid?: string;
  mchid?: string;
  out_trade_no: string;
  transaction_id?: string;
  trade_type?: string;
  trade_state: string;
  trade_state_desc?: string;
  success_time?: string;
  attach?: string;
  amount?: {
    total?: number;
    payer_total?: number;
    currency?: string;
    payer_currency?: string;
  };
}

export interface WechatPayNotification<T = Record<string, any>> {
  id: string;
  create_time: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: {
    algorithm: string;
    ciphertext: string;
    nonce: string;
    associated_data?: string;
    original_type: string;
  };
  decryptedResource: T;
}

type RequestMethod = 'GET' | 'POST';

let platformCertificateCache:
  | { cert: WechatPlatformCertificate; cachedAt: number }
  | null = null;

function getRuntimeEnv(key: string) {
  return process.env[key];
}

function normalizeMultilineSecret(value: string) {
  return value.replace(/\r/g, '').replace(/\\n/g, '\n').trim();
}

async function getConfiguredValue(
  envValues: Array<string | undefined>,
  fallback = ''
) {
  for (const envValue of envValues) {
    if (envValue && envValue.trim()) {
      return envValue.trim();
    }
  }

  return fallback;
}

export async function getWechatPayV3Config(): Promise<WechatPayV3Config> {
  const [
    mchid,
    appid,
    mpAppId,
    mpSecret,
    notifyUrl,
    apiV3Key,
    serialNo,
    privateKey,
    transferSceneId,
    transferSceneInfoType,
    transferSceneInfoContent,
  ] = await Promise.all([
    getConfiguredValue([
      getRuntimeEnv('WECHAT_PAY_MCHID'),
    ]),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_PAY_APPID'),
    ]),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_MP_APPID'),
    ]),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_MP_SECRET'),
    ]),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_PAY_NOTIFY_URL'),
    ], 'https://hfb.yugioh.top/api/payment/wechat/jsapi/callback'),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_PAY_API_V3_KEY'),
    ]),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_PAY_SERIAL_NO'),
    ]),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_PAY_PRIVATE_KEY'),
    ]),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_PAY_TRANSFER_SCENE_ID'),
    ]),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_PAY_TRANSFER_SCENE_INFO_TYPE'),
    ], '活动名称'),
    getConfiguredValue([
      getRuntimeEnv('WECHAT_PAY_TRANSFER_SCENE_INFO_CONTENT'),
    ], '平台提现'),
  ]);

  return {
    mchid,
    appid,
    mpAppId,
    mpSecret,
    notifyUrl,
    apiV3Key,
    serialNo,
    privateKey: normalizeMultilineSecret(privateKey),
    transferSceneId,
    transferSceneInfoType,
    transferSceneInfoContent,
  };
}

export async function assertWechatPayV3Config(requiredFields?: Array<keyof WechatPayV3Config>) {
  const config = await getWechatPayV3Config();
  const fields = requiredFields || [
    'mchid',
    'appid',
    'notifyUrl',
    'apiV3Key',
    'serialNo',
    'privateKey',
  ];

  const missing = fields.filter((field) => !config[field]);
  return {
    config,
    valid: missing.length === 0,
    missing,
  };
}

function getPrivateKeyObject(privateKey: string) {
  return crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
  });
}

function buildAuthorizationHeader(
  config: WechatPayV3Config,
  method: RequestMethod,
  pathWithQuery: string,
  body: string,
) {
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${method}\n${pathWithQuery}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(message)
    .sign(getPrivateKeyObject(config.privateKey), 'base64');

  return `${WECHAT_PAY_SCHEMA} mchid="${config.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;
}

async function sendWechatPayRequest<T>(
  method: RequestMethod,
  pathWithQuery: string,
  options?: {
    body?: Record<string, any>;
    extraHeaders?: Record<string, string>;
  }
): Promise<T> {
  const config = await getWechatPayV3Config();
  const bodyText = options?.body ? JSON.stringify(options.body) : '';
  const authorization = buildAuthorizationHeader(config, method, pathWithQuery, bodyText);

  const response = await fetch(`${WECHAT_PAY_API_HOST}${pathWithQuery}`, {
    method,
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.extraHeaders,
    },
    body: bodyText || undefined,
    cache: 'no-store',
  });

  const responseText = await response.text();
  const parsed = responseText ? JSON.parse(responseText) : {};

  if (!response.ok) {
    const message = (parsed as any).message || (parsed as any).code || `Wechat Pay request failed with status ${response.status}`;
    throw new Error(message);
  }

  return parsed as T;
}

function decryptAes256Gcm(params: {
  apiV3Key: string;
  associatedData?: string;
  nonce: string;
  ciphertext: string;
}) {
  const apiV3Key = Buffer.from(params.apiV3Key, 'utf8');
  const ciphertext = Buffer.from(params.ciphertext, 'base64');
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const data = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', apiV3Key, Buffer.from(params.nonce, 'utf8'));

  if (params.associatedData) {
    decipher.setAAD(Buffer.from(params.associatedData, 'utf8'));
  }

  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export async function getWechatPlatformCertificate(forceRefresh = false): Promise<WechatPlatformCertificate> {
  const cached = platformCertificateCache;
  if (!forceRefresh && cached && Date.now() - cached.cachedAt < 6 * 60 * 60 * 1000) {
    return cached.cert;
  }

  const config = await getWechatPayV3Config();
  const result = await sendWechatPayRequest<{
    data: Array<{
      serial_no: string;
      effective_time: string;
      expire_time: string;
      encrypt_certificate: {
        algorithm: string;
        nonce: string;
        associated_data?: string;
        ciphertext: string;
      };
    }>;
  }>('GET', '/v3/certificates');

  if (!result.data?.length) {
    throw new Error('未获取到微信支付平台证书');
  }

  const latest = result.data
    .slice()
    .sort((a, b) => new Date(b.effective_time).getTime() - new Date(a.effective_time).getTime())[0];

  const certificatePem = decryptAes256Gcm({
    apiV3Key: config.apiV3Key,
    nonce: latest.encrypt_certificate.nonce,
    associatedData: latest.encrypt_certificate.associated_data,
    ciphertext: latest.encrypt_certificate.ciphertext,
  });

  const cert = {
    serialNo: latest.serial_no,
    certificatePem,
  };

  platformCertificateCache = {
    cert,
    cachedAt: Date.now(),
  };

  return cert;
}

export async function verifyWechatPaySignature(rawBody: string, headers: Headers) {
  const serial = headers.get('Wechatpay-Serial') || headers.get('wechatpay-serial');
  const signature = headers.get('Wechatpay-Signature') || headers.get('wechatpay-signature');
  const nonce = headers.get('Wechatpay-Nonce') || headers.get('wechatpay-nonce');
  const timestamp = headers.get('Wechatpay-Timestamp') || headers.get('wechatpay-timestamp');

  if (!serial || !signature || !nonce || !timestamp) {
    throw new Error('微信支付回调签名头缺失');
  }

  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  let cert = await getWechatPlatformCertificate();
  if (cert.serialNo !== serial) {
    cert = await getWechatPlatformCertificate(true);
  }

  if (cert.serialNo !== serial) {
    throw new Error('微信支付平台证书序列号不匹配');
  }

  const verified = crypto
    .createVerify('RSA-SHA256')
    .update(message)
    .verify(cert.certificatePem, signature, 'base64');

  if (!verified) {
    throw new Error('微信支付回调验签失败');
  }
}

export async function decryptWechatPayNotification<T = Record<string, any>>(
  rawBody: string,
  headers: Headers,
): Promise<WechatPayNotification<T>> {
  await verifyWechatPaySignature(rawBody, headers);
  const payload = JSON.parse(rawBody) as Omit<WechatPayNotification<T>, 'decryptedResource'>;
  const config = await getWechatPayV3Config();

  const decryptedResource = JSON.parse(
    decryptAes256Gcm({
      apiV3Key: config.apiV3Key,
      nonce: payload.resource.nonce,
      associatedData: payload.resource.associated_data,
      ciphertext: payload.resource.ciphertext,
    })
  ) as T;

  return {
    ...payload,
    decryptedResource,
  };
}

export async function createJsapiTransaction(params: CreateJsapiTransactionParams) {
  const config = await getWechatPayV3Config();
  return sendWechatPayRequest<{
    prepay_id: string;
  }>('POST', '/v3/pay/transactions/jsapi', {
    body: {
      appid: params.appid || config.mpAppId || config.appid,
      mchid: config.mchid,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl || config.notifyUrl,
      attach: params.attach,
      amount: {
        total: params.totalFeeFen,
        currency: 'CNY',
      },
      payer: {
        openid: params.payerOpenid,
      },
      scene_info: {
        payer_client_ip: params.payerClientIp || '127.0.0.1',
      },
    },
  });
}

export async function createH5Transaction(params: CreateH5TransactionParams) {
  const config = await getWechatPayV3Config();
  return sendWechatPayRequest<{
    h5_url: string;
  }>('POST', '/v3/pay/transactions/h5', {
    body: {
      appid: params.appid || config.appid,
      mchid: config.mchid,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl || config.notifyUrl,
      attach: params.attach,
      amount: {
        total: params.totalFeeFen,
        currency: 'CNY',
      },
      scene_info: {
        payer_client_ip: params.payerClientIp || '127.0.0.1',
        h5_info: {
          type: params.h5Type || 'Wap',
          app_name: params.appName || 'YuGiOh',
          app_url: params.appUrl || 'https://hfb.yugioh.top',
        },
      },
    },
  });
}

export async function createNativeTransaction(params: CreateNativeTransactionParams) {
  const config = await getWechatPayV3Config();
  return sendWechatPayRequest<{
    code_url: string;
  }>('POST', '/v3/pay/transactions/native', {
    body: {
      appid: params.appid || config.appid,
      mchid: config.mchid,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl || config.notifyUrl,
      attach: params.attach,
      amount: {
        total: params.totalFeeFen,
        currency: 'CNY',
      },
    },
  });
}

export async function queryTransactionByOutTradeNo(outTradeNo: string) {
  const config = await getWechatPayV3Config();
  const encodedOutTradeNo = encodeURIComponent(outTradeNo);
  const encodedMchid = encodeURIComponent(config.mchid);

  return sendWechatPayRequest<WechatPayTransactionResult>(
    'GET',
    `/v3/pay/transactions/out-trade-no/${encodedOutTradeNo}?mchid=${encodedMchid}`
  );
}

export async function buildJsapiPaymentParams(prepayId: string, appId?: string) {
  const config = await getWechatPayV3Config();
  const finalAppId = appId || config.mpAppId || config.appid;
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const pkg = `prepay_id=${prepayId}`;
  const message = `${finalAppId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  const paySign = crypto
    .createSign('RSA-SHA256')
    .update(message)
    .sign(getPrivateKeyObject(config.privateKey), 'base64');

  return {
    appId: finalAppId,
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign,
  };
}

function encryptWithPlatformCertificate(content: string, certificatePem: string) {
  return crypto
    .publicEncrypt(
      {
        key: certificatePem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha1',
      },
      Buffer.from(content, 'utf8')
    )
    .toString('base64');
}

export async function createTransferBill(params: CreateTransferBillParams) {
  const config = await getWechatPayV3Config();
  if (!config.transferSceneId) {
    throw new Error('缺少 WECHAT_PAY_TRANSFER_SCENE_ID 配置');
  }

  const platformCert = await getWechatPlatformCertificate();
  const payload: Record<string, any> = {
    appid: params.appid || config.mpAppId || config.appid,
    out_bill_no: params.outBillNo,
    transfer_scene_id: config.transferSceneId,
    openid: params.openid,
    transfer_amount: params.transferAmountFen,
    transfer_remark: params.transferRemark,
    notify_url: params.notifyUrl || config.notifyUrl,
    transfer_scene_report_infos: [
      {
        info_type: config.transferSceneInfoType,
        info_content: config.transferSceneInfoContent,
      },
    ],
  };

  if (params.userName) {
    payload.user_name = encryptWithPlatformCertificate(params.userName, platformCert.certificatePem);
  }
  if (params.userRecvPerception) {
    payload.user_recv_perception = params.userRecvPerception;
  }

  return sendWechatPayRequest<{
    out_bill_no: string;
    transfer_bill_no: string;
    create_time: string;
    state: string;
    package_info?: string;
  }>('POST', '/v3/fund-app/mch-transfer/transfer-bills', {
    body: payload,
    extraHeaders: {
      'Wechatpay-Serial': platformCert.serialNo,
    },
  });
}

export async function queryTransferBill(outBillNo: string) {
  return sendWechatPayRequest<{
    out_bill_no: string;
    transfer_bill_no: string;
    state: string;
    fail_reason?: string;
    update_time?: string;
  }>('GET', `/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${outBillNo}`);
}
