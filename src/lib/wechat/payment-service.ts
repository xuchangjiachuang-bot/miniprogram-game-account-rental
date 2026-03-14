import type { NextRequest } from 'next/server';
import type { User } from '@/lib/user-service';
import { checkWechatPayConfig } from '@/lib/wechat/config';
import { getAuthenticatedPaymentUser } from '@/lib/wechat/payment-flow';
import { createWechatOrderPayment, createWechatRechargePayment, type WechatPaymentChannel } from '@/lib/wechat/payment-request';

export async function requireWechatPaymentUser(request: NextRequest) {
  const user = await getAuthenticatedPaymentUser(request);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

export async function assertWechatPaymentConfigured() {
  const configCheck = await checkWechatPayConfig();
  if (!configCheck.valid) {
    const error = new Error('WECHAT_PAY_CONFIG_INVALID') as Error & { missing?: string[] };
    error.missing = configCheck.missing;
    throw error;
  }
}

export function resolveWechatPaymentError(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  const missing = typeof error === 'object' && error !== null && 'missing' in error
    ? ((error as { missing?: string[] }).missing || [])
    : [];

  return {
    message,
    missing,
  };
}

export async function createOrderWechatPayment(params: {
  request: NextRequest;
  user: User;
  orderId: string;
  channel: WechatPaymentChannel;
  openid?: string;
}) {
  return createWechatOrderPayment(params);
}

export async function createRechargeWechatPayment(params: {
  request: NextRequest;
  user: User;
  amount: number;
  channel: WechatPaymentChannel;
  openid?: string;
}) {
  return createWechatRechargePayment(params);
}
