/**
 * 分账服务（优化版）
 * 处理订单分账计算和提现手续费计算
 * 支持多种场景：正常完成、退款、部分退款、违规扣款
 */

// ==================== 类型定义 ====================

// 平台配置类型
export interface PlatformConfig {
  commission_rate: number;      // 平台佣金比例 (%)
  withdrawal_fee_ratio: number; // 提现手续费比例 (%)
  min_rental_price: number;     // 最低租金
  deposit_ratio: number;        // 押金比例 (%)
  coins_per_day: number;        // 每10M对应租期（天）
  min_rental_hours: number;     // 最低租期（小时）
  max_coins_per_account: number;// 单账号最大哈夫币
  max_deposit: number;          // 最大押金
}

// 订单状态枚举
export enum OrderStatus {
  PENDING = 'pending',                 // 待支付
  PAID = 'paid',                       // 已支付
  PENDING_VERIFICATION = 'pending_verification', // 待验收
  ACTIVE = 'active',                   // 租赁中
  COMPLETED = 'completed',             // 已完成
  DISPUTED = 'disputed',               // 争议中
  REFUNDING = 'refunding',             // 退款中
  REFUNDED = 'refunded',               // 已退款
  CANCELLED = 'cancelled'              // 已取消
}

// 退款类型枚举
export enum RefundType {
  FULL = 'full',                 // 全额退款
  PARTIAL = 'partial',           // 部分退款
  DEPOSIT_ONLY = 'deposit_only', // 仅退押金
  PENALTY = 'penalty'            // 违规扣款
}

// 分账类型枚举
export enum SplitType {
  NORMAL = 'normal',             // 正常分账
  REFUND = 'refund',             // 退款分账
  PENALTY = 'penalty'            // 扣款分账
}

// 基础分账结果类型
export interface SplitResult {
  platform_commission: number;   // 平台佣金
  seller_amount: number;         // 卖家应得金额
  platform_ratio: number;        // 平台抽佣比例
  seller_ratio: number;          // 卖家获得比例
}

// 订单完成分账结果
export interface OrderCompletionSplitResult extends SplitResult {
  deposit_refund: number;        // 退还给买家的押金
  buyer_amount: number;          // 买家获得金额（押金）
  total_amount: number;          // 总金额
}

// 退款分账结果
export interface RefundSplitResult {
  refund_amount: number;         // 退款总额
  refund_deposit: number;        // 退还押金
  refund_rent: number;           // 退还租金
  seller_amount: number;         // 卖家获得金额
  platform_commission: number;   // 平台佣金
  platform_ratio: number;        // 平台比例
}

// 提现手续费计算结果
export interface WithdrawalFeeResult {
  withdrawal_fee: number;        // 手续费比例 (%)
  fee_amount: number;            // 手续费金额
  actual_amount: number;         // 实际到账金额
}

// 订单金额信息
export interface OrderAmounts {
  rentAmount: number;            // 租金
  rentHours: number;             // 租期（小时）
  deposit: number;               // 押金
  platform_commission: number;   // 平台佣金
  seller_amount: number;         // 卖家应得
  totalAmount: number;           // 总金额
  platform_ratio: number;        // 平台比例
  seller_ratio: number;          // 卖家比例
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: PlatformConfig = {
  commission_rate: 5,
  withdrawal_fee_ratio: 1,
  min_rental_price: 50,
  deposit_ratio: 50,
  coins_per_day: 10,
  min_rental_hours: 24,
  max_coins_per_account: 1000,
  max_deposit: 10000
};

// ==================== 租金和押金计算 ====================

/**
 * 计算租金
 * @param coins 哈夫币数量（百万为单位）
 * @param ratio 比例（如35表示1:35）
 * @returns 租金金额
 */
export function calculateRentPrice(coins: number, ratio: number): number {
  // 公式：账号价值 = (哈夫币数量 * 1000000) / (比例 * 10000)
  // 简化为：账号价值 = (coins * 100) / ratio
  const accountValue = (coins * 100) / ratio;

  // 确保不低于最低租金
  return Math.max(accountValue, DEFAULT_CONFIG.min_rental_price);
}

/**
 * 计算租期
 * @param coins 哈夫币数量（百万为单位）
 * @returns 租期（小时）
 */
export function calculateRentalDuration(coins: number): number {
  // 规则：每10M = 1天（24小时）
  const days = coins / DEFAULT_CONFIG.coins_per_day;
  const hours = days * 24;

  // 确保不低于最低租期
  return Math.max(hours, DEFAULT_CONFIG.min_rental_hours);
}

/**
 * 计算押金
 * @param accountValue 账号价值
 * @param coins 哈夫币数量（百万为单位）
 * @returns 押金金额
 */
export function calculateDeposit(accountValue: number, coins: number): number {
  // 押金 = 账号价值 × 押金比例
  let deposit = accountValue * (DEFAULT_CONFIG.deposit_ratio / 100);

  // 确保不超过最大押金
  deposit = Math.min(deposit, DEFAULT_CONFIG.max_deposit);

  return deposit;
}

// ==================== 订单金额计算 ====================

/**
 * 计算完整的订单金额
 * @param coins 哈夫币数量（百万为单位）
 * @param ratio 比例
 * @returns 完整的订单金额信息
 */
export function calculateOrderAmounts(coins: number, ratio: number): OrderAmounts {
  const rentAmount = calculateRentPrice(coins, ratio);
  const rentHours = calculateRentalDuration(coins);
  const accountValue = rentAmount; // 账号价值 = 租金（简化）
  const deposit = calculateDeposit(accountValue, coins);
  const split = calculateSplit(rentAmount);
  const totalAmount = rentAmount + deposit;

  return {
    rentAmount,
    rentHours,
    deposit,
    platform_commission: split.platform_commission,
    seller_amount: split.seller_amount,
    totalAmount,
    platform_ratio: split.platform_ratio,
    seller_ratio: split.seller_ratio
  };
}

/**
 * 验证订单金额是否合法
 * @param rentAmount 租金
 * @param deposit 押金
 * @param coins 哈夫币数量
 * @returns 验证结果
 */
export function validateOrderAmount(
  rentAmount: number,
  deposit: number,
  coins: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查租金是否低于最低租金
  if (rentAmount < DEFAULT_CONFIG.min_rental_price) {
    errors.push(`租金不能低于 ${DEFAULT_CONFIG.min_rental_price} 元`);
  }

  // 检查哈夫币数量是否超过上限
  if (coins > DEFAULT_CONFIG.max_coins_per_account) {
    errors.push(`哈夫币数量不能超过 ${DEFAULT_CONFIG.max_coins_per_account}M`);
  }

  // 检查押金是否超过最大值
  if (deposit > DEFAULT_CONFIG.max_deposit) {
    errors.push(`押金不能超过 ${DEFAULT_CONFIG.max_deposit} 元`);
  }

  // 检查押金是否合理（不应超过租金的3倍）
  if (deposit > rentAmount * 3) {
    errors.push(`押金金额不合理`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ==================== 分账计算 ====================

/**
 * 计算基础分账（仅租金分账）
 * @param rentAmount 租金金额
 * @param commissionRate 平台佣金比例（%）
 * @returns 分账结果
 */
export function calculateSplit(
  rentAmount: number,
  commissionRate: number = DEFAULT_CONFIG.commission_rate
): SplitResult {
  const platform_commission = rentAmount * (commissionRate / 100);
  const seller_amount = rentAmount - platform_commission;

  return {
    platform_commission,
    seller_amount,
    platform_ratio: commissionRate,
    seller_ratio: 100 - commissionRate
  };
}

/**
 * 计算订单完成分账（正常完成场景）
 *
 * 业务逻辑：
 * - 押金全额退还给买家
 * - 租金进行分账：平台佣金 + 卖家金额
 *
 * @param rentAmount 租金金额
 * @param depositAmount 押金金额
 * @param commissionRate 平台佣金比例（%）
 * @returns 分账结果
 */
export function calculateOrderCompletionSplit(
  rentAmount: number,
  depositAmount: number,
  commissionRate: number = DEFAULT_CONFIG.commission_rate
): OrderCompletionSplitResult {
  const split = calculateSplit(rentAmount, commissionRate);

  return {
    platform_commission: split.platform_commission,
    seller_amount: split.seller_amount,
    platform_ratio: split.platform_ratio,
    seller_ratio: split.seller_ratio,
    deposit_refund: depositAmount,
    buyer_amount: depositAmount,
    total_amount: rentAmount + depositAmount
  };
}

/**
 * 计算退款分账（多种退款场景）
 *
 * 场景1：全额退款（FULL）
 *   - 租金 + 押金全部退还给买家
 *   - 平台不收取佣金
 *   - 卖家不获得任何金额
 *
 * 场景2：部分退款（PARTIAL）
 *   - 押金全额退还给买家
 *   - 部分租金退还给买家
 *   - 剩余租金进行分账：平台佣金 + 卖家金额
 *
 * 场景3：仅退押金（DEPOSIT_ONLY）
 *   - 押金全额退还给买家
 *   - 租金进行正常分账：平台佣金 + 卖家金额
 *
 * 场景4：违规扣款（PENALTY）
 *   - 押金扣除，赔付给卖家
 *   - 租金进行正常分账：平台佣金 + 卖家金额
 *   - 买家不获得任何金额
 *
 * @param rentAmount 租金金额
 * @param depositAmount 押金金额
 * @param refundType 退款类型
 * @param refundRatio 退款比例（仅部分退款时使用，0-100）
 * @param commissionRate 平台佣金比例（%）
 * @returns 分账结果
 */
export function calculateRefundSplit(
  rentAmount: number,
  depositAmount: number,
  refundType: RefundType,
  refundRatio: number = 50,
  commissionRate: number = DEFAULT_CONFIG.commission_rate
): RefundSplitResult {
  let refund_deposit = 0;
  let refund_rent = 0;
  let seller_amount = 0;
  let platform_commission = 0;

  switch (refundType) {
    case RefundType.FULL:
      // 全额退款：租金 + 押金全部退还
      refund_deposit = depositAmount;
      refund_rent = rentAmount;
      seller_amount = 0;
      platform_commission = 0;
      break;

    case RefundType.PARTIAL:
      // 部分退款：押金全额退 + 部分租金退
      refund_deposit = depositAmount;
      refund_rent = rentAmount * (refundRatio / 100);
      const remainingRent = rentAmount - refund_rent;
      const split = calculateSplit(remainingRent, commissionRate);
      seller_amount = split.seller_amount;
      platform_commission = split.platform_commission;
      break;

    case RefundType.DEPOSIT_ONLY:
      // 仅退押金：押金全额退 + 租金正常分账
      refund_deposit = depositAmount;
      refund_rent = 0;
      const normalSplit = calculateSplit(rentAmount, commissionRate);
      seller_amount = normalSplit.seller_amount;
      platform_commission = normalSplit.platform_commission;
      break;

    case RefundType.PENALTY:
      // 违规扣款：押金赔付给卖家 + 租金正常分账
      refund_deposit = 0; // 买家不获得押金
      refund_rent = 0;    // 买家不获得租金
      const penaltySplit = calculateSplit(rentAmount, commissionRate);
      seller_amount = penaltySplit.seller_amount + depositAmount; // 卖家获得租金 + 押金
      platform_commission = penaltySplit.platform_commission;
      break;

    default:
      throw new Error(`未知的退款类型: ${refundType}`);
  }

  return {
    refund_amount: refund_deposit + refund_rent,
    refund_deposit,
    refund_rent,
    seller_amount,
    platform_commission,
    platform_ratio: commissionRate
  };
}

// ==================== 提现手续费计算 ====================

/**
 * 计算提现手续费
 * @param amount 提现金额
 * @param feeRatio 手续费比例（%）
 * @returns 手续费计算结果
 */
export function calculateWithdrawalFee(
  amount: number,
  feeRatio: number = DEFAULT_CONFIG.withdrawal_fee_ratio
): WithdrawalFeeResult {
  const fee_amount = amount * (feeRatio / 100);
  const actual_amount = amount - fee_amount;

  return {
    withdrawal_fee: feeRatio,
    fee_amount,
    actual_amount
  };
}

// ==================== 工具函数 ====================

/**
 * 格式化金额显示
 * @param amount 金额
 * @returns 格式化后的字符串
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * 格式化百分比
 * @param ratio 比例
 * @returns 格式化后的字符串
 */
export function formatPercentage(ratio: number): string {
  return `${ratio}%`;
}

/**
 * 获取订单状态文本
 * @param status 订单状态
 * @returns 状态文本
 */
export function getOrderStatusText(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: '待支付',
    [OrderStatus.PENDING_VERIFICATION]: '待验证',
    [OrderStatus.PAID]: '已支付',
    [OrderStatus.ACTIVE]: '租赁中',
    [OrderStatus.COMPLETED]: '已完成',
    [OrderStatus.DISPUTED]: '争议中',
    [OrderStatus.REFUNDING]: '退款中',
    [OrderStatus.REFUNDED]: '已退款',
    [OrderStatus.CANCELLED]: '已取消'
  };
  return statusMap[status] || '未知';
}

/**
 * 获取退款类型文本
 * @param type 退款类型
 * @returns 类型文本
 */
export function getRefundTypeText(type: RefundType): string {
  const typeMap: Record<RefundType, string> = {
    [RefundType.FULL]: '全额退款',
    [RefundType.PARTIAL]: '部分退款',
    [RefundType.DEPOSIT_ONLY]: '仅退押金',
    [RefundType.PENALTY]: '违规扣款'
  };
  return typeMap[type] || '未知';
}
