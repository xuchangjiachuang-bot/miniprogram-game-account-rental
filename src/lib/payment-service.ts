/**
 * 第三方支付集成服务（模拟）
 * 支持微信支付、支付宝支付
 * 模拟支付流程和回调处理
 */

import { UserType, TransactionType, changeBalance, freezeBalance, ChangeBalanceParams } from './balance-service';
import { updateOrderStatus } from './order-service';

// ==================== 类型定义 ====================

// 支付类型
export type PaymentType = 'wechat' | 'alipay' | 'bank';

// 支付状态
export enum PaymentStatus {
  PENDING = 'pending',       // 待支付
  SUCCESS = 'success',       // 成功
  FAILED = 'failed',         // 失败
  REFUNDED = 'refunded'      // 已退款
}

// 支付记录
export interface PaymentRecord {
  id: string;
  payment_no: string;
  order_id: string;
  user_id: string;

  // 支付信息
  payment_type: PaymentType;
  amount: number;

  // 状态信息
  status: PaymentStatus;

  // 第三方支付信息
  third_party_no?: string;
  transaction_id?: string;

  // 回调信息
  callback_data?: any;
  callback_at?: Date;

  // 退款信息
  refund_no?: string;
  refund_status: 'none' | 'refunding' | 'refunded';
  refund_amount: number;

  created_at: Date;
  updated_at: Date;
}

// 创建支付参数
export interface CreatePaymentParams {
  order_id: string;
  user_id: string;
  payment_type: PaymentType;
  amount: number;
}

// 支付结果
export interface PaymentResult {
  success: boolean;
  message: string;
  payment?: PaymentRecord;
}

// 模拟支付参数
export interface MockPaymentParams {
  payment_no: string;
  success: boolean;
}

// 退款参数
export interface RefundPaymentParams {
  payment_id: string;
  refund_amount: number;
  refund_reason: string;
}

// ==================== 工具函数 ====================

/**
 * 生成支付单号
 * @returns 支付单号
 */
export function generatePaymentNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PAY${timestamp}${random}`;
}

/**
 * 生成退款单号
 * @returns 退款单号
 */
export function generateRefundNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `REF${timestamp}${random}`;
}

/**
 * 获取支付类型文本
 * @param type 支付类型
 * @returns 类型文本
 */
export function getPaymentTypeText(type: PaymentType): string {
  const typeMap: Record<PaymentType, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank: '银行卡'
  };
  return typeMap[type] || '未知';
}

/**
 * 获取支付状态文本
 * @param status 支付状态
 * @returns 状态文本
 */
export function getPaymentStatusText(status: PaymentStatus): string {
  const statusMap: Record<PaymentStatus, string> = {
    [PaymentStatus.PENDING]: '待支付',
    [PaymentStatus.SUCCESS]: '支付成功',
    [PaymentStatus.FAILED]: '支付失败',
    [PaymentStatus.REFUNDED]: '已退款'
  };
  return statusMap[status] || '未知';
}

// ==================== 模拟数据库 ====================

// 模拟支付记录
const mockPayments: Map<string, PaymentRecord> = new Map();

// ==================== 支付服务 ====================

/**
 * 创建支付订单
 * @param params 创建参数
 * @returns 支付结果
 */
export function createPayment(params: CreatePaymentParams): PaymentResult {
  try {
    // 创建支付记录
    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
      payment_no: generatePaymentNo(),
      order_id: params.order_id,
      user_id: params.user_id,

      // 支付信息
      payment_type: params.payment_type,
      amount: params.amount,

      // 状态信息
      status: PaymentStatus.PENDING,

      // 退款信息
      refund_status: 'none',
      refund_amount: 0,

      created_at: new Date(),
      updated_at: new Date()
    };

    mockPayments.set(payment.id, payment);

    return {
      success: true,
      message: '支付订单创建成功',
      payment
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
 * 模拟支付成功（用于测试）
 * @param params 模拟支付参数
 * @returns 支付结果
 */
export function mockPaymentSuccess(params: MockPaymentParams): PaymentResult {
  const payment = Array.from(mockPayments.values()).find(
    p => p.payment_no === params.payment_no
  );

  if (!payment) {
    return {
      success: false,
      message: '支付记录不存在'
    };
  }

  if (payment.status !== PaymentStatus.PENDING) {
    return {
      success: false,
      message: `支付状态不正确，当前状态：${getPaymentStatusText(payment.status)}`
    };
  }

  try {
    if (params.success) {
      // 支付成功
      payment.status = PaymentStatus.SUCCESS;
      payment.third_party_no = `TP${Date.now()}`;
      payment.transaction_id = `TX${Date.now()}`;
      payment.callback_data = {
        out_trade_no: payment.payment_no,
        trade_no: payment.transaction_id,
        total_fee: payment.amount,
        time_end: new Date().toISOString()
      };
      payment.callback_at = new Date();
      payment.updated_at = new Date();

      // 更新订单状态
      updateOrderStatus(payment.order_id, 'paid' as any);

      // 冻结押金
      const freezeParams = {
        user_id: payment.user_id,
        user_type: 'buyer' as UserType,
        amount: payment.amount,
        transaction_type: TransactionType.DEPOSIT_FREEZE,
        remark: `支付${payment.payment_no}成功，冻结资金`,
        related_order_id: payment.order_id
      };

      // 注意：这里应该先冻结，但由于是模拟，我们简化处理
      // 实际项目中，应该在回调处理时冻结资金

      return {
        success: true,
        message: '支付成功',
        payment
      };
    } else {
      // 支付失败
      payment.status = PaymentStatus.FAILED;
      payment.updated_at = new Date();

      return {
        success: false,
        message: '支付失败',
        payment
      };
    }
  } catch (error: any) {
    console.error('模拟支付失败:', error);
    return {
      success: false,
      message: error.message || '模拟支付失败'
    };
  }
}

/**
 * 处理支付回调
 * @param paymentNo 支付单号
 * @param callbackData 回调数据
 * @returns 处理结果
 */
export function handlePaymentCallback(paymentNo: string, callbackData: any): PaymentResult {
  const payment = Array.from(mockPayments.values()).find(
    p => p.payment_no === paymentNo
  );

  if (!payment) {
    return {
      success: false,
      message: '支付记录不存在'
    };
  }

  if (payment.status !== PaymentStatus.PENDING) {
    return {
      success: false,
      message: `支付状态不正确，当前状态：${getPaymentStatusText(payment.status)}`
    };
  }

  try {
    // 更新支付状态
    payment.status = PaymentStatus.SUCCESS;
    payment.third_party_no = callbackData.trade_no;
    payment.transaction_id = callbackData.transaction_id;
    payment.callback_data = callbackData;
    payment.callback_at = new Date();
    payment.updated_at = new Date();

    // 更新订单状态
    updateOrderStatus(payment.order_id, 'paid' as any);

    // 冻结资金
    const freezeParams = {
      user_id: payment.user_id,
      user_type: 'buyer' as UserType,
      amount: payment.amount,
      transaction_type: TransactionType.DEPOSIT_FREEZE as any,
      remark: `支付${payment.payment_no}成功，冻结资金`,
      related_order_id: payment.order_id
    };

    freezeBalance(freezeParams);

    return {
      success: true,
      message: '支付回调处理成功',
      payment
    };
  } catch (error: any) {
    console.error('处理支付回调失败:', error);
    return {
      success: false,
      message: error.message || '处理支付回调失败'
    };
  }
}

/**
 * 处理退款
 * @param params 退款参数
 * @returns 处理结果
 */
export function processRefund(params: RefundPaymentParams): PaymentResult {
  const payment = mockPayments.get(params.payment_id);

  if (!payment) {
    return {
      success: false,
      message: '支付记录不存在'
    };
  }

  if (payment.status !== PaymentStatus.SUCCESS) {
    return {
      success: false,
      message: `支付状态不支持退款，当前状态：${getPaymentStatusText(payment.status)}`
    };
  }

  if (payment.refund_status === 'refunded') {
    return {
      success: false,
      message: '该支付已退款'
    };
  }

  if (params.refund_amount > payment.amount) {
    return {
      success: false,
      message: `退款金额不能超过支付金额，支付金额：${payment.amount}`
    };
  }

  try {
    // 更新支付记录
    payment.refund_status = 'refunding';
    payment.refund_no = generateRefundNo();
    payment.refund_amount = params.refund_amount;
    payment.updated_at = new Date();

    // 模拟退款成功
    payment.refund_status = 'refunded';
    payment.status = PaymentStatus.REFUNDED;
    payment.updated_at = new Date();

    return {
      success: true,
      message: '退款处理成功',
      payment
    };
  } catch (error: any) {
    console.error('处理退款失败:', error);
    return {
      success: false,
      message: error.message || '处理退款失败'
    };
  }
}

/**
 * 获取支付记录
 * @param paymentId 支付ID
 * @returns 支付记录
 */
export function getPayment(paymentId: string): PaymentRecord | null {
  return mockPayments.get(paymentId) || null;
}

/**
 * 获取支付单号获取支付记录
 * @param paymentNo 支付单号
 * @returns 支付记录
 */
export function getPaymentByNo(paymentNo: string): PaymentRecord | null {
  for (const payment of mockPayments.values()) {
    if (payment.payment_no === paymentNo) {
      return payment;
    }
  }
  return null;
}

/**
 * 获取订单支付记录
 * @param orderId 订单ID
 * @returns 支付记录
 */
export function getPaymentByOrderId(orderId: string): PaymentRecord | null {
  for (const payment of mockPayments.values()) {
    if (payment.order_id === orderId) {
      return payment;
    }
  }
  return null;
}

/**
 * 获取用户支付记录
 * @param userId 用户ID
 * @param limit 限制数量
 * @returns 支付记录列表
 */
export function getUserPayments(userId: string, limit: number = 50): PaymentRecord[] {
  return Array.from(mockPayments.values())
    .filter(p => p.user_id === userId)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit);
}
