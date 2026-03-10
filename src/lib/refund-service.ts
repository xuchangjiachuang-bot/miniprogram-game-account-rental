/**
 * 售后处理服务
 * 处理退款申请、审核、计算和执行
 * 集成订单服务、分账服务和余额服务
 */

import { OrderStatus, RefundType, calculateRefundSplit, getRefundTypeText } from './split-service';
import { UserType, TransactionType, changeBalance, ChangeBalanceParams } from './balance-service';
import { getOrder, updateOrderStatus } from './order-service';

// ==================== 类型定义 ====================

// 售后申请信息
export interface RefundRequest {
  id: string;
  request_no: string;
  order_id: string;
  user_id: string;
  user_type: UserType;

  // 申请信息
  request_type: RefundType;
  refund_amount: number;
  refund_ratio?: number;

  // 原因信息
  reason: string;
  evidence_urls?: string[];

  // 审核信息
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_id?: string;
  admin_remark?: string;

  // 处理信息
  actual_refund_amount: number;
  actual_penalize_amount: number;
  processed_at?: Date;

  created_at: Date;
  updated_at: Date;
}

// 创建售后申请参数
export interface CreateRefundRequestParams {
  order_id: string;
  user_id: string;
  user_type: UserType;
  request_type: RefundType;
  refund_amount: number;
  refund_ratio?: number;
  reason: string;
  evidence_urls?: string[];
}

// 审核售后申请参数
export interface ApproveRefundParams {
  refund_request_id: string;
  admin_id: string;
  admin_remark?: string;
}

// 拒绝售后申请参数
export interface RejectRefundParams {
  refund_request_id: string;
  admin_id: string;
  admin_remark: string;
}

// 审核结果
export interface ProcessRefundResult {
  success: boolean;
  message: string;
  refund_request?: RefundRequest;
  transactions?: ChangeBalanceParams[];
}

// ==================== 工具函数 ====================

/**
 * 生成售后申请单号
 * @returns 申请单号
 */
export function generateRefundRequestNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `RFD${timestamp}${random}`;
}

/**
 * 验证退款金额是否合法
 * @param refundAmount 申请退款金额
 * @param totalAmount 订单总金额
 * @returns 是否合法
 */
export function validateRefundAmount(refundAmount: number, totalAmount: number): boolean {
  return refundAmount > 0 && refundAmount <= totalAmount;
}

// ==================== 模拟数据库 ====================

// 模拟售后申请数据
const mockRefundRequests: Map<string, RefundRequest> = new Map();

// ==================== 售后处理服务 ====================

/**
 * 创建售后申请
 * @param params 创建参数
 * @returns 创建的售后申请
 */
export async function createRefundRequest(params: CreateRefundRequestParams): Promise<RefundRequest> {
  const order = await getOrder(params.order_id);

  if (!order) {
    throw new Error('订单不存在');
  }

  // 验证订单状态
  if (order.status !== OrderStatus.ACTIVE && order.status !== OrderStatus.DISPUTED) {
    throw new Error(`订单状态不支持申请售后，当前状态：${order.status}`);
  }

  // 验证退款金额
  if (!validateRefundAmount(params.refund_amount, order.total_amount)) {
    throw new Error(`退款金额不合法，订单总金额：${order.total_amount}`);
  }

  // 创建售后申请
  const refundRequest: RefundRequest = {
    id: crypto.randomUUID(),
    request_no: generateRefundRequestNo(),
    order_id: params.order_id,
    user_id: params.user_id,
    user_type: params.user_type,

    // 申请信息
    request_type: params.request_type,
    refund_amount: params.refund_amount,
    refund_ratio: params.refund_ratio,

    // 原因信息
    reason: params.reason,
    evidence_urls: params.evidence_urls,

    // 审核信息
    status: 'pending',

    // 处理信息
    actual_refund_amount: 0,
    actual_penalize_amount: 0,

    created_at: new Date(),
    updated_at: new Date()
  };

  // 更新订单状态为争议中
  if (order.status === OrderStatus.ACTIVE) {
    await updateOrderStatus(order.id, OrderStatus.DISPUTED);
  }

  mockRefundRequests.set(refundRequest.id, refundRequest);
  return refundRequest;
}

/**
 * 获取售后申请
 * @param requestId 售后申请ID
 * @returns 售后申请信息
 */
export function getRefundRequest(requestId: string): RefundRequest | null {
  return mockRefundRequests.get(requestId) || null;
}

/**
 * 获取售后申请号获取售后申请
 * @param requestNo 售后申请号
 * @returns 售后申请信息
 */
export function getRefundRequestByNo(requestNo: string): RefundRequest | null {
  for (const request of mockRefundRequests.values()) {
    if (request.request_no === requestNo) {
      return request;
    }
  }
  return null;
}

/**
 * 批准售后申请并执行退款
 *
 * 业务逻辑：
 * 1. 验证售后申请状态
 * 2. 计算退款分账（根据退款类型）
 * 3. 更新订单退款信息
 * 4. 执行余额变动
 * 5. 更新售后申请状态
 *
 * @param params 批准参数
 * @returns 处理结果
 */
export async function approveRefundRequest(params: ApproveRefundParams): Promise<ProcessRefundResult> {
  const refundRequest = getRefundRequest(params.refund_request_id);

  if (!refundRequest) {
    return {
      success: false,
      message: '售后申请不存在'
    };
  }

  if (refundRequest.status !== 'pending') {
    return {
      success: false,
      message: `售后申请状态不正确，当前状态：${refundRequest.status}`
    };
  }

  const order = await getOrder(refundRequest.order_id);

  if (!order) {
    return {
      success: false,
      message: '订单不存在'
    };
  }

  try {
    // 1. 计算退款分账
    const split = calculateRefundSplit(
      order.rent_amount,
      order.deposit_amount,
      refundRequest.request_type,
      refundRequest.refund_ratio || 50,
      order.commission_rate
    );

    const transactions: ChangeBalanceParams[] = [];

    // 2. 根据退款类型执行不同的余额变动
    if (refundRequest.request_type === RefundType.FULL) {
      // 全额退款：租金 + 押金全部退还给买家
      const buyerTransaction: ChangeBalanceParams = {
        user_id: order.buyer_id,
        user_type: 'buyer' as UserType,
        amount: split.refund_amount,
        transaction_type: TransactionType.REFUND,
        remark: `售后申请${refundRequest.request_no}批准，全额退款`,
        related_order_id: order.id,
        related_refund_id: refundRequest.id
      };
      transactions.push(buyerTransaction);
    } else if (refundRequest.request_type === RefundType.PARTIAL) {
      // 部分退款：押金全额退 + 部分租金退
      const buyerTransaction: ChangeBalanceParams = {
        user_id: order.buyer_id,
        user_type: 'buyer' as UserType,
        amount: split.refund_amount,
        transaction_type: TransactionType.REFUND,
        remark: `售后申请${refundRequest.request_no}批准，部分退款（${refundRequest.refund_ratio}%）`,
        related_order_id: order.id,
        related_refund_id: refundRequest.id
      };
      transactions.push(buyerTransaction);

      // 卖家获得剩余租金
      if (split.seller_amount > 0) {
        const sellerTransaction: ChangeBalanceParams = {
          user_id: order.seller_id,
          user_type: 'seller' as UserType,
          amount: split.seller_amount,
          transaction_type: TransactionType.RENT_INCOME,
          remark: `售后申请${refundRequest.request_no}批准，部分租金收入`,
          related_order_id: order.id,
          related_refund_id: refundRequest.id
        };
        transactions.push(sellerTransaction);
      }

      // 平台获得佣金（如果有）
      if (split.platform_commission > 0) {
        const platformTransaction: ChangeBalanceParams = {
          user_id: 'PLATFORM',
          user_type: 'seller' as UserType,
          amount: split.platform_commission,
          transaction_type: TransactionType.PLATFORM_INCOME,
          remark: `售后申请${refundRequest.request_no}批准，平台佣金`,
          related_order_id: order.id,
          related_refund_id: refundRequest.id
        };
        transactions.push(platformTransaction);
      }
    } else if (refundRequest.request_type === RefundType.DEPOSIT_ONLY) {
      // 仅退押金：押金全额退 + 租金正常分账
      const buyerTransaction: ChangeBalanceParams = {
        user_id: order.buyer_id,
        user_type: 'buyer' as UserType,
        amount: split.refund_amount,
        transaction_type: TransactionType.DEPOSIT_REFUND,
        remark: `售后申请${refundRequest.request_no}批准，仅退押金`,
        related_order_id: order.id,
        related_refund_id: refundRequest.id
      };
      transactions.push(buyerTransaction);

      // 卖家获得租金
      if (split.seller_amount > 0) {
        const sellerTransaction: ChangeBalanceParams = {
          user_id: order.seller_id,
          user_type: 'seller' as UserType,
          amount: split.seller_amount,
          transaction_type: TransactionType.RENT_INCOME,
          remark: `售后申请${refundRequest.request_no}批准，租金收入`,
          related_order_id: order.id,
          related_refund_id: refundRequest.id
        };
        transactions.push(sellerTransaction);
      }

      // 平台获得佣金
      if (split.platform_commission > 0) {
        const platformTransaction: ChangeBalanceParams = {
          user_id: 'PLATFORM',
          user_type: 'seller' as UserType,
          amount: split.platform_commission,
          transaction_type: TransactionType.PLATFORM_INCOME,
          remark: `售后申请${refundRequest.request_no}批准，平台佣金`,
          related_order_id: order.id,
          related_refund_id: refundRequest.id
        };
        transactions.push(platformTransaction);
      }
    } else if (refundRequest.request_type === RefundType.PENALTY) {
      // 违规扣款：押金赔付给卖家 + 租金正常分账
      const sellerTransaction: ChangeBalanceParams = {
        user_id: order.seller_id,
        user_type: 'seller' as UserType,
        amount: split.seller_amount,
        transaction_type: TransactionType.RENT_INCOME,
        remark: `售后申请${refundRequest.request_no}批准，租金收入 + 押金赔付`,
        related_order_id: order.id,
        related_refund_id: refundRequest.id
      };
      transactions.push(sellerTransaction);

      // 买家扣款
      const buyerPenaltyTransaction: ChangeBalanceParams = {
        user_id: order.buyer_id,
        user_type: 'buyer' as UserType,
        amount: -order.deposit_amount,
        transaction_type: TransactionType.PENALTY,
        remark: `售后申请${refundRequest.request_no}批准，违规扣款（押金）`,
        related_order_id: order.id,
        related_refund_id: refundRequest.id
      };
      transactions.push(buyerPenaltyTransaction);

      // 平台获得佣金
      if (split.platform_commission > 0) {
        const platformTransaction: ChangeBalanceParams = {
          user_id: 'PLATFORM',
          user_type: 'seller' as UserType,
          amount: split.platform_commission,
          transaction_type: TransactionType.PLATFORM_INCOME,
          remark: `售后申请${refundRequest.request_no}批准，平台佣金`,
          related_order_id: order.id,
          related_refund_id: refundRequest.id
        };
        transactions.push(platformTransaction);
      }
    }

    // 3. 执行余额变动
    for (const transaction of transactions) {
      changeBalance(transaction);
    }

    // 4. 更新订单信息
    await updateOrderStatus(order.id, OrderStatus.REFUNDED);

    // 5. 更新售后申请信息
    refundRequest.status = 'approved';
    refundRequest.actual_refund_amount = split.refund_amount;
    refundRequest.actual_penalize_amount = refundRequest.request_type === RefundType.PENALTY ? order.deposit_amount : 0;
    refundRequest.admin_id = params.admin_id;
    refundRequest.admin_remark = params.admin_remark;
    refundRequest.processed_at = new Date();
    refundRequest.updated_at = new Date();

    return {
      success: true,
      message: '售后申请已批准，退款成功',
      refund_request: refundRequest,
      transactions
    };
  } catch (error: any) {
    console.error('批准售后申请失败:', error);
    return {
      success: false,
      message: error.message || '批准售后申请失败'
    };
  }
}

/**
 * 拒绝售后申请
 *
 * 业务逻辑：
 * 1. 验证售后申请状态
 * 2. 更新售后申请状态为拒绝
 * 3. 恢复订单状态
 *
 * @param params 拒绝参数
 * @returns 处理结果
 */
export async function rejectRefundRequest(params: RejectRefundParams): Promise<ProcessRefundResult> {
  const refundRequest = getRefundRequest(params.refund_request_id);

  if (!refundRequest) {
    return {
      success: false,
      message: '售后申请不存在'
    };
  }

  if (refundRequest.status !== 'pending') {
    return {
      success: false,
      message: `售后申请状态不正确，当前状态：${refundRequest.status}`
    };
  }

  try {
    // 1. 更新售后申请信息
    refundRequest.status = 'rejected';
    refundRequest.admin_id = params.admin_id;
    refundRequest.admin_remark = params.admin_remark;
    refundRequest.updated_at = new Date();

    // 2. 恢复订单状态
    const order = await getOrder(refundRequest.order_id);
    if (order) {
      await updateOrderStatus(order.id, OrderStatus.ACTIVE);
    }

    return {
      success: true,
      message: '售后申请已拒绝',
      refund_request: refundRequest
    };
  } catch (error: any) {
    console.error('拒绝售后申请失败:', error);
    return {
      success: false,
      message: error.message || '拒绝售后申请失败'
    };
  }
}

/**
 * 获取用户的售后申请列表
 * @param userId 用户ID
 * @param status 状态（可选）
 * @returns 售后申请列表
 */
export function getUserRefundRequests(userId: string, status?: string): RefundRequest[] {
  let requests = Array.from(mockRefundRequests.values()).filter(
    request => request.user_id === userId
  );

  if (status) {
    requests = requests.filter(request => request.status === status);
  }

  return requests.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
}

/**
 * 获取所有售后申请列表（管理员）
 * @param status 状态（可选）
 * @returns 售后申请列表
 */
export function getAllRefundRequests(status?: string): RefundRequest[] {
  let requests = Array.from(mockRefundRequests.values());

  if (status) {
    requests = requests.filter(request => request.status === status);
  }

  return requests.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
}
