export type WechatWebPaymentChannel = 'jsapi' | 'h5' | 'native';

interface PaymentIntent {
  orderId?: string;
  rechargeAmount?: string | number;
  rechargeId?: string;
}

const MOBILE_USER_AGENT_PATTERN = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const WECHAT_USER_AGENT_PATTERN = /MicroMessenger/i;

export function detectWechatWebPaymentChannel(userAgent: string): WechatWebPaymentChannel {
  if (WECHAT_USER_AGENT_PATTERN.test(userAgent)) {
    return 'jsapi';
  }

  if (MOBILE_USER_AGENT_PATTERN.test(userAgent)) {
    return 'h5';
  }

  return 'native';
}

export function buildWechatPaymentHref(
  channel: WechatWebPaymentChannel,
  intent: PaymentIntent,
) {
  const params = new URLSearchParams();

  if (intent.orderId) {
    params.set('orderId', intent.orderId);
  }

  if (intent.rechargeAmount !== undefined && intent.rechargeAmount !== null && intent.rechargeAmount !== '') {
    params.set('rechargeAmount', String(intent.rechargeAmount));
  }

  if (intent.rechargeId) {
    params.set('rechargeId', intent.rechargeId);
  }

  const query = params.toString();
  return `/payment/wechat/${channel}${query ? `?${query}` : ''}`;
}

export function buildWechatPaymentHrefForCurrentEnv(intent: PaymentIntent) {
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const channel = detectWechatWebPaymentChannel(userAgent);
  return buildWechatPaymentHref(channel, intent);
}
