import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { accounts, db, orders, paymentRecords, userBalances, users } from '@/lib/db';
import type { User } from '@/lib/user-service';
import {
  buildJsapiPaymentParams,
  createH5Transaction,
  createJsapiTransaction,
  createNativeTransaction,
} from '@/lib/wechat/v3';
import { getRequestClientIp, getWechatNotifyBaseUrl } from '@/lib/wechat/payment-flow';
import { yuanToFen } from '@/lib/wechat/utils';

export type WechatPaymentChannel = 'jsapi' | 'h5' | 'native';

interface CreateOrderPaymentOptions {
  request: NextRequest;
  user: User;
  orderId: string;
  channel: WechatPaymentChannel;
  openid?: string;
}

interface CreateRechargePaymentOptions {
  request: NextRequest;
  user: User;
  amount: number;
  channel: WechatPaymentChannel;
  openid?: string;
}

function getNotifyUrl(request: NextRequest, channel: WechatPaymentChannel) {
  return `${getWechatNotifyBaseUrl(request)}/api/payment/wechat/${channel}/callback`;
}

function getRechargeOrderNoPrefix(channel: WechatPaymentChannel) {
  switch (channel) {
    case 'h5':
      return 'RH';
    case 'native':
      return 'RN';
    default:
      return 'RC';
  }
}

export async function createWechatOrderPayment(options: CreateOrderPaymentOptions) {
  const { request, user, orderId, channel, openid } = options;
  const orderList = await db
    .select({
      order: orders,
      account: accounts,
      buyer: users,
    })
    .from(orders)
    .innerJoin(accounts, eq(orders.accountId, accounts.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(and(eq(orders.id, orderId), eq(orders.buyerId, user.id)))
    .limit(1);

  if (orderList.length === 0) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const { order, buyer } = orderList[0];
  if (['paid', 'completed'].includes(order.status || '')) {
    throw new Error('ORDER_ALREADY_PAID');
  }
  if (order.status === 'cancelled') {
    throw new Error('ORDER_CANCELLED');
  }

  const resolvedOpenid = openid || buyer.wechatOpenid || user.wechat_openid || undefined;
  const outTradeNo = order.id.replace(/-/g, '');
  const description = `订单支付 - ${order.orderNo}`;
  const totalFeeFen = yuanToFen(Number(order.totalPrice || 0));
  const notifyUrl = getNotifyUrl(request, channel);
  const attach = JSON.stringify({
    kind: 'order',
    orderId: order.id,
  });

  if (channel === 'jsapi') {
    if (!resolvedOpenid) {
      throw new Error('MISSING_OPENID');
    }

    const payment = await createJsapiTransaction({
      description,
      outTradeNo,
      totalFeeFen,
      payerOpenid: resolvedOpenid,
      notifyUrl,
      attach,
      payerClientIp: getRequestClientIp(request),
    });

    const jsapiParams = await buildJsapiPaymentParams(payment.prepay_id);
    return {
      ...jsapiParams,
      orderId: order.id,
      totalPrice: Number(order.totalPrice || 0),
    };
  }

  if (channel === 'h5') {
    const payment = await createH5Transaction({
      description,
      outTradeNo,
      totalFeeFen,
      notifyUrl,
      attach,
      payerClientIp: getRequestClientIp(request),
      appUrl: getWechatNotifyBaseUrl(request),
    });

    return {
      orderId: order.id,
      totalPrice: Number(order.totalPrice || 0),
      mwebUrl: payment.h5_url,
    };
  }

  const payment = await createNativeTransaction({
    description,
    outTradeNo,
    totalFeeFen,
    notifyUrl,
    attach,
  });

  return {
    orderId: order.id,
    totalPrice: Number(order.totalPrice || 0),
    codeUrl: payment.code_url,
  };
}

export async function createWechatRechargePayment(options: CreateRechargePaymentOptions) {
  const { request, user, amount, channel, openid } = options;
  const resolvedAmount = Number(amount || 0);

  if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
    throw new Error('INVALID_RECHARGE_AMOUNT');
  }

  const resolvedOpenid = openid || user.wechat_openid || undefined;
  if (channel === 'jsapi' && !resolvedOpenid) {
    throw new Error('MISSING_OPENID');
  }

  const existingBalance = await db
    .select({ id: userBalances.id })
    .from(userBalances)
    .where(eq(userBalances.userId, user.id))
    .limit(1);

  if (existingBalance.length === 0) {
    await db.insert(userBalances).values({
      id: crypto.randomUUID(),
      userId: user.id,
      availableBalance: '0',
      frozenBalance: '0',
      totalWithdrawn: '0',
      totalEarned: '0',
    });
  }

  const paymentRecordId = crypto.randomUUID();
  const outTradeNo = paymentRecordId.replace(/-/g, '');
  const orderNo = `${getRechargeOrderNoPrefix(channel)}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  await db.insert(paymentRecords).values({
    id: paymentRecordId,
    orderId: paymentRecordId,
    orderNo,
    userId: user.id,
    amount: resolvedAmount.toFixed(2),
    type: 'recharge',
    method: 'wechat',
    transactionId: '',
    thirdPartyOrderId: outTradeNo,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });

  const description = `钱包充值 ${resolvedAmount.toFixed(2)} 元`;
  const totalFeeFen = yuanToFen(resolvedAmount);
  const notifyUrl = getNotifyUrl(request, channel);
  const attach = JSON.stringify({
    kind: 'wallet_recharge',
    paymentRecordId,
    userId: user.id,
  });

  if (channel === 'jsapi') {
    const payment = await createJsapiTransaction({
      description,
      outTradeNo,
      totalFeeFen,
      payerOpenid: resolvedOpenid as string,
      notifyUrl,
      attach,
      payerClientIp: getRequestClientIp(request),
    });

    const jsapiParams = await buildJsapiPaymentParams(payment.prepay_id);
    return {
      ...jsapiParams,
      rechargeId: paymentRecordId,
      amount: resolvedAmount,
    };
  }

  if (channel === 'h5') {
    const payment = await createH5Transaction({
      description,
      outTradeNo,
      totalFeeFen,
      notifyUrl,
      attach,
      payerClientIp: getRequestClientIp(request),
      appUrl: getWechatNotifyBaseUrl(request),
    });

    return {
      rechargeId: paymentRecordId,
      amount: resolvedAmount,
      mwebUrl: payment.h5_url,
    };
  }

  const payment = await createNativeTransaction({
    description,
    outTradeNo,
    totalFeeFen,
    notifyUrl,
    attach,
  });

  return {
    rechargeId: paymentRecordId,
    amount: resolvedAmount,
    codeUrl: payment.code_url,
  };
}
