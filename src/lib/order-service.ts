/**
 * 订单状态管理服务
 * 处理订单状态流转、完成订单、取消订单等操作
 * 集成分账服务和余额服务
 */

import { OrderStatus, RefundType, calculateOrderCompletionSplit, calculateRefundSplit, getOrderStatusText } from './split-service';
import { UserType, TransactionType, changeBalance, unfreezeBalance, getUserBalance, ChangeBalanceParams } from './balance-service';
import { sendNotification } from './notification-service';
import { getAccountById } from './account-service';
import { chatManager } from '@/storage/database/chatManager';
import { db, orders } from '@/lib/db';
import { eq, and, desc, or } from 'drizzle-orm';

// ==================== 类型定义 ====================

// 订单信息
export interface Order {
  id: string;
  order_no: string;
  account_id: string;
  buyer_id: string;
  seller_id: string;

  // 账号信息
  coins_million: number;
  price_ratio: number;
  account_value: number;

  // 金额信息
  rent_amount: number;
  deposit_amount: number;
  total_amount: number;

  // 租期信息
  rent_hours: number;

  // 分账信息
  platform_commission: number;
  seller_amount: number;
  commission_rate: number;

  // 订单状态
  status: OrderStatus;

  // 时间信息
  start_time: Date | null;
  end_time: Date | null;
  actual_start_time: Date | null;
  actual_end_time: Date | null;

  // 退款信息
  refund_amount: number;
  refund_type: RefundType | 'none';
  refund_status: string;
  refund_reason: string | null;

  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// 创建订单参数
export interface CreateOrderParams {
  account_id: string;
  buyer_id: string;
  seller_id: string;
  coins_million: number;
  price_ratio: number;
  rent_amount: number;
  deposit_amount: number;
  total_amount: number;
  rent_hours: number;
}

// 完成订单结果
export interface CompleteOrderResult {
  success: boolean;
  message: string;
  order: Order;
  transactions?: {
    seller?: ChangeBalanceParams;
    buyer?: ChangeBalanceParams;
    platform?: ChangeBalanceParams;
  };
}

// 取消订单结果
export interface CancelOrderResult {
  success: boolean;
  message: string;
  order: Order;
}

// ==================== 工具函数 ====================

/**
 * 转换数据库订单到Order接口格式
 * @param dbOrder 数据库订单
 * @returns Order接口格式
 */
function transformDbOrderToOrder(dbOrder: any): Order {
  return {
    id: dbOrder.id,
    order_no: dbOrder.orderNo,
    account_id: dbOrder.accountId,
    buyer_id: dbOrder.buyerId,
    seller_id: dbOrder.sellerId,

    // 账号信息
    coins_million: 0, // 需要从账号表查询
    price_ratio: 0, // 需要从账号表查询
    account_value: parseFloat(dbOrder.rentalPrice || '0'),

    // 金额信息
    rent_amount: parseFloat(dbOrder.rentalPrice || '0'),
    deposit_amount: parseFloat(dbOrder.deposit || '0'),
    total_amount: parseFloat(dbOrder.totalPrice || '0'),

    // 租期信息
    rent_hours: dbOrder.rentalDuration,

    // 分账信息
    platform_commission: parseFloat(dbOrder.platformCommission || '0'),
    seller_amount: parseFloat(dbOrder.sellerIncome || '0'),
    commission_rate: 5,

    // 订单状态
    status: dbOrder.status as OrderStatus,

    // 时间信息
    start_time: dbOrder.startTime ? new Date(dbOrder.startTime) : null,
    end_time: dbOrder.endTime ? new Date(dbOrder.endTime) : null,
    actual_start_time: null,
    actual_end_time: dbOrder.actualEndTime ? new Date(dbOrder.actualEndTime) : null,

    // 退款信息
    refund_amount: 0,
    refund_type: 'none',
    refund_status: 'none',
    refund_reason: null,

    created_at: new Date(dbOrder.createdAt || Date.now()),
    updated_at: new Date(dbOrder.updatedAt || Date.now()),
    deleted_at: null
  };
}

/**
 * 转换数据库订单到前端API格式（camelCase）
 * @param dbOrder 数据库订单
 * @returns 前端API格式
 */
export function transformDbOrderToApiFormat(dbOrder: any): any {
  return {
    id: dbOrder.id,
    orderNo: dbOrder.orderNo,
    order_no: dbOrder.orderNo,
    order_number: dbOrder.orderNo,
    accountId: dbOrder.accountId,
    account_id: dbOrder.accountId,
    accountName: '游戏账号', // 需要从账号表查询
    accountImage: '/images/default-account.png', // 需要从账号表查询
    buyerId: dbOrder.buyerId,
    buyer_id: dbOrder.buyerId,
    sellerId: dbOrder.sellerId,
    seller_id: dbOrder.sellerId,
    
    // 账号信息（默认值，需要从账号表查询）
    coinsM: 0,
    coins_million: 0,
    rentalRatio: 35,
    price_ratio: 35,
    safeboxCount: 0,
    staminaValue: 0,
    energyValue: 0,
    
    // 金额信息
    rent_amount: parseFloat(dbOrder.rentalPrice || '0'),
    rentalPrice: parseFloat(dbOrder.rentalPrice || '0'),
    deposit: parseFloat(dbOrder.deposit || '0'),
    deposit_amount: parseFloat(dbOrder.deposit || '0'),
    total_price: parseFloat(dbOrder.totalPrice || '0'),
    total_amount: parseFloat(dbOrder.totalPrice || '0'),
    
    // 租期信息
    rent_hours: dbOrder.rentalDuration,
    rentalDuration: dbOrder.rentalDuration,
    
    // 分账信息
    platformCommission: parseFloat(dbOrder.platformCommission || '0'),
    platform_commission: parseFloat(dbOrder.platformCommission || '0'),
    sellerIncome: parseFloat(dbOrder.sellerIncome || '0'),
    seller_amount: parseFloat(dbOrder.sellerIncome || '0'),
    commissionRate: 5,
    commission_rate: 5,
    
    // 订单状态
    status: dbOrder.status,
    
    // 时间信息
    startTime: dbOrder.startTime,
    start_time: dbOrder.startTime ? new Date(dbOrder.startTime) : null,
    endTime: dbOrder.endTime,
    end_time: dbOrder.endTime ? new Date(dbOrder.endTime) : null,
    actualStartTime: null,
    actual_start_time: null,
    actualEndTime: dbOrder.actualEndTime,
    actual_end_time: dbOrder.actualEndTime ? new Date(dbOrder.actualEndTime) : null,
    
    // 退款信息
    refund_amount: 0,
    refundType: 'none',
    refund_type: 'none',
    refundStatus: 'none',
    refund_status: 'none',
    refundReason: null,
    refund_reason: null,
    
    // 其他信息
    paymentMethod: dbOrder.paymentMethod,
    paymentTime: dbOrder.paymentTime,
    createdAt: dbOrder.createdAt,
    created_at: new Date(dbOrder.createdAt || Date.now()),
    updatedAt: dbOrder.updatedAt,
    updated_at: new Date(dbOrder.updatedAt || Date.now()),
    
    // 平台费用
    platformFee: parseFloat(dbOrder.platformFee || '0'),
    platform_fee: parseFloat(dbOrder.platformFee || '0'),
    withdrawalFee: parseFloat(dbOrder.withdrawalFee || '0'),
    withdrawal_fee: parseFloat(dbOrder.withdrawalFee || '0'),
    
    // 结算信息
    isSettled: dbOrder.isSettled || false,
    is_settled: dbOrder.isSettled || false,
    settledAt: dbOrder.settledAt,
    settled_at: dbOrder.settledAt
  };
}

/**
 * 生成订单号
 * @returns 订单号
 */
export function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ORD${timestamp}${random}`;
}

/**
 * 验证订单状态流转
 * @param currentStatus 当前状态
 * @param targetStatus 目标状态
 * @returns 是否可以流转
 */
export function validateStatusTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PENDING_VERIFICATION]: [OrderStatus.ACTIVE, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.PENDING_VERIFICATION, OrderStatus.ACTIVE, OrderStatus.CANCELLED],
    [OrderStatus.ACTIVE]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [], // 已完成不能再流转
    [OrderStatus.DISPUTED]: [OrderStatus.REFUNDING, OrderStatus.ACTIVE, OrderStatus.COMPLETED],
    [OrderStatus.REFUNDING]: [OrderStatus.REFUNDED],
    [OrderStatus.REFUNDED]: [], // 已退款不能再流转
    [OrderStatus.CANCELLED]: [] // 已取消不能再流转
  };

  return transitions[currentStatus]?.includes(targetStatus) || false;
}

// ==================== 模拟数据库 ====================

// 模拟订单数据
const mockOrders: Map<string, Order> = new Map();

// ==================== 订单管理服务 ====================

/**
 * 创建订单
 * @param params 创建参数
 * @returns 创建的订单
 */
export async function createOrder(params: CreateOrderParams): Promise<Order> {
  // 生成订单ID和订单号
  const orderId = crypto.randomUUID();
  const orderNo = generateOrderNo();

  // 插入订单到数据库
  const [insertedOrder] = await db.insert(orders).values({
    id: orderId,
    orderNo: orderNo,
    accountId: params.account_id,
    buyerId: params.buyer_id,
    sellerId: params.seller_id,
    status: 'pending_payment',
    rentalDuration: params.rent_hours,
    rentalPrice: params.rent_amount.toString(),
    deposit: params.deposit_amount.toString(),
    totalPrice: params.total_amount.toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).returning();

  // 查询完整的订单信息（包含账号信息）
  const orderData = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  
  if (!orderData || orderData.length === 0) {
    throw new Error('订单创建失败');
  }

  const dbOrder = orderData[0];

  // 转换为Order接口格式（snake_case）
  const order: Order = {
    id: dbOrder.id,
    order_no: dbOrder.orderNo,
    account_id: dbOrder.accountId,
    buyer_id: dbOrder.buyerId,
    seller_id: dbOrder.sellerId,

    // 账号信息
    coins_million: params.coins_million,
    price_ratio: params.price_ratio,
    account_value: params.rent_amount,

    // 金额信息
    rent_amount: parseFloat(dbOrder.rentalPrice || '0'),
    deposit_amount: parseFloat(dbOrder.deposit || '0'),
    total_amount: parseFloat(dbOrder.totalPrice || '0'),

    // 租期信息
    rent_hours: dbOrder.rentalDuration,

    // 分账信息（暂时为0，完成时计算）
    platform_commission: 0,
    seller_amount: 0,
    commission_rate: 5,

    // 订单状态
    status: dbOrder.status as OrderStatus,

    // 时间信息
    start_time: dbOrder.startTime ? new Date(dbOrder.startTime) : null,
    end_time: dbOrder.endTime ? new Date(dbOrder.endTime) : null,
    actual_start_time: null,
    actual_end_time: dbOrder.actualEndTime ? new Date(dbOrder.actualEndTime) : null,

    // 退款信息
    refund_amount: 0,
    refund_type: 'none',
    refund_status: 'none',
    refund_reason: null,

    created_at: new Date(dbOrder.createdAt || Date.now()),
    updated_at: new Date(dbOrder.updatedAt || Date.now()),
    deleted_at: null
  };

  // 发送通知给卖家：新订单创建
  const account = await getAccountById(params.account_id);
  sendNotification({
    userId: params.seller_id,
    type: 'account_rented',
    title: '新订单通知',
    content: `您的账号"${account?.title}"有新订单，订单号：${order.order_no}`,
    extras: {
      orderInfo: {
        orderNo: order.order_no,
        rentalDuration: params.rent_hours,
        rentalPrice: params.rent_amount,
      }
    }
  });

  // 异步创建聊天群（不阻塞订单创建）
  (async () => {
    try {
      const groupChat = await chatManager.createGroupChat({
        orderId: order.id,
        title: `订单 ${order.order_no} 聊天群`,
        buyerId: params.buyer_id,
        sellerId: params.seller_id,
      });
      console.log(`为订单 ${order.order_no} 创建聊天群成功：${groupChat.id}`);
    } catch (error) {
      console.error(`为订单 ${order.order_no} 创建聊天群失败：`, error);
    }
  })();

  return order;
}

/**
 * 获取订单
 * @param orderId 订单ID
 * @returns 订单信息
 */
export async function getOrder(orderId: string): Promise<Order | null> {
  const orderData = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  
  if (!orderData || orderData.length === 0) {
    return null;
  }

  return transformDbOrderToOrder(orderData[0]);
}

/**
 * 获取订单号获取订单
 * @param orderNo 订单号
 * @returns 订单信息
 */
export async function getOrderByNo(orderNo: string): Promise<Order | null> {
  const orderData = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
  
  if (!orderData || orderData.length === 0) {
    return null;
  }

  return transformDbOrderToOrder(orderData[0]);
}

/**
 * 更新订单状态
 * @param orderId 订单ID
 * @param newStatus 新状态
 * @returns 是否成功
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  const order = await getOrder(orderId);

  if (!order) {
    throw new Error('订单不存在');
  }

  // 验证状态流转
  if (!validateStatusTransition(order.status, newStatus)) {
    throw new Error(`不能从状态 ${order.status} 流转到 ${newStatus}`);
  }

  // 更新数据库中的订单状态
  await db.update(orders)
    .set({ 
      status: newStatus,
      updatedAt: new Date().toISOString()
    })
    .where(eq(orders.id, orderId));

  return true;
}

/**
 * 完成订单（正常完成场景）
 *
 * 业务逻辑：
 * 1. 更新订单状态为 COMPLETED
 * 2. 计算分账：押金退还给买家 + 租金分账（平台佣金 + 卖家金额）
 * 3. 解冻买家押金
 * 4. 增加买家可用余额（押金退还）
 * 5. 增加卖家可用余额（租金收入）
 * 6. 增加平台可用余额（佣金）
 *
 * @param orderId 订单ID
 * @returns 完成结果
 */
export async function completeOrder(orderId: string): Promise<CompleteOrderResult> {
  const order = await getOrder(orderId);

  if (!order) {
    return {
      success: false,
      message: '订单不存在',
      order: {} as Order
    };
  }

  if (order.status !== OrderStatus.ACTIVE) {
    return {
      success: false,
      message: `订单状态不正确，当前状态：${getOrderStatusText(order.status)}`,
      order
    };
  }

  try {
    // 1. 计算分账
    const split = calculateOrderCompletionSplit(
      order.rent_amount,
      order.deposit_amount,
      order.commission_rate
    );

    // 2. 更新订单信息到数据库
    await db.update(orders)
      .set({
        status: OrderStatus.COMPLETED,
        actualEndTime: new Date().toISOString(),
        platformCommission: split.platform_commission.toString(),
        sellerIncome: split.seller_amount.toString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(orders.id, orderId));

    // 重新获取订单信息
    const updatedOrder = await getOrder(orderId);
    if (!updatedOrder) {
      throw new Error('订单更新后查询失败');
    }

    // 3. 执行余额变动

    // 买家：解冻押金 + 增加可用余额（押金退还）
    const buyerTransaction: ChangeBalanceParams = {
      user_id: order.buyer_id,
      user_type: 'buyer' as UserType,
      amount: split.deposit_refund,
      transaction_type: TransactionType.DEPOSIT_REFUND,
      remark: `订单${order.order_no}完成，押金退还`,
      related_order_id: order.id
    };

    // 卖家：增加可用余额（租金收入）
    const sellerTransaction: ChangeBalanceParams = {
      user_id: order.seller_id,
      user_type: 'seller' as UserType,
      amount: split.seller_amount,
      transaction_type: TransactionType.RENT_INCOME,
      remark: `订单${order.order_no}完成，租金收入`,
      related_order_id: order.id
    };

    // 平台：增加可用余额（佣金）- 假设平台用户ID为 'PLATFORM'
    const platformTransaction: ChangeBalanceParams = {
      user_id: 'PLATFORM',
      user_type: 'seller' as UserType,
      amount: split.platform_commission,
      transaction_type: TransactionType.PLATFORM_INCOME,
      remark: `订单${order.order_no}完成，平台佣金`,
      related_order_id: order.id
    };

    // 执行余额变动
    changeBalance(buyerTransaction);
    changeBalance(sellerTransaction);
    changeBalance(platformTransaction);

    // 发送通知给买家：订单完成
    const account = await getAccountById(order.account_id);
    sendNotification({
      userId: order.buyer_id,
      type: 'order_completed',
      title: '订单完成',
      content: `您租赁的账号"${account?.title}"已完成，押金已退还`,
      extras: {
        orderInfo: {
          orderNo: order.order_no,
        }
      }
    });

    // 发送通知给卖家：订单完成，租金到账
    sendNotification({
      userId: order.seller_id,
      type: 'order_completed',
      title: '订单完成',
      content: `您的订单"${order.order_no}"已完成，租金¥${split.seller_amount.toFixed(2)}已到账`,
      extras: {
        orderInfo: {
          orderNo: order.order_no,
        }
      }
    });

    return {
      success: true,
      message: '订单完成，分账成功',
      order: updatedOrder,
      transactions: {
        seller: sellerTransaction,
        buyer: buyerTransaction,
        platform: platformTransaction
      }
    };
  } catch (error: any) {
    console.error('完成订单失败:', error);
    const order = await getOrder(orderId);
    return {
      success: false,
      message: error.message || '完成订单失败',
      order: order || ({} as Order)
    };
  }
}

/**
 * 取消订单
 *
 * 业务逻辑：
 * 1. 更新订单状态为 CANCELLED
 * 2. 退还买家全部金额（租金 + 押金）
 * 3. 解冻买家押金
 * 4. 平台不收取佣金
 *
 * @param orderId 订单ID
 * @param reason 取消原因
 * @returns 取消结果
 */
export async function cancelOrder(orderId: string, reason: string = '用户取消'): Promise<CancelOrderResult> {
  const order = await getOrder(orderId);

  if (!order) {
    return {
      success: false,
      message: '订单不存在',
      order: {} as Order
    };
  }

  if (order.status === OrderStatus.COMPLETED) {
    return {
      success: false,
      message: '订单已完成，不能取消',
      order
    };
  }

  if (order.status === OrderStatus.CANCELLED) {
    return {
      success: false,
      message: '订单已取消',
      order
    };
  }

  try {
    // 1. 更新订单信息到数据库
    await db.update(orders)
      .set({
        status: OrderStatus.CANCELLED,
        updatedAt: new Date().toISOString()
      })
      .where(eq(orders.id, orderId));

    // 2. 执行退款
    const buyerTransaction: ChangeBalanceParams = {
      user_id: order.buyer_id,
      user_type: 'buyer' as UserType,
      amount: order.total_amount,
      transaction_type: TransactionType.REFUND,
      remark: `订单${order.order_no}取消，全额退款`,
      related_order_id: order.id
    };

    // 执行余额变动
    changeBalance(buyerTransaction);

    // 发送通知给买家：订单已取消
    const account = await getAccountById(order.account_id);
    sendNotification({
      userId: order.buyer_id,
      type: 'order_cancelled',
      title: '订单已取消',
      content: `您的订单"${order.order_no}"已取消，退款¥${order.total_amount.toFixed(2)}已到账`,
      extras: {
        orderInfo: {
          orderNo: order.order_no,
        }
      }
    });

    // 发送通知给卖家：订单已取消
    sendNotification({
      userId: order.seller_id,
      type: 'order_cancelled',
      title: '订单已取消',
      content: `订单"${order.order_no}"已取消，原因：${reason}`,
      extras: {
        orderInfo: {
          orderNo: order.order_no,
        }
      }
    });

    // 重新获取订单信息
    const updatedOrder = await getOrder(orderId);

    return {
      success: true,
      message: '订单已取消，退款成功',
      order: updatedOrder || ({} as Order)
    };
  } catch (error: any) {
    console.error('取消订单失败:', error);
    const order = await getOrder(orderId);
    return {
      success: false,
      message: error.message || '取消订单失败',
      order: order || ({} as Order)
    };
  }
}

/**
 * 获取用户订单列表
 * @param userId 用户ID
 * @param status 订单状态（可选）
 * @returns 订单列表（API格式）
 */
export async function getUserOrders(userId: string, status?: OrderStatus): Promise<any[]> {
  let query = db.select().from(orders).where(
    or(
      eq(orders.buyerId, userId),
      eq(orders.sellerId, userId)
    )
  ).orderBy(desc(orders.createdAt));

  if (status) {
    query = db.select().from(orders).where(
      and(
        or(
          eq(orders.buyerId, userId),
          eq(orders.sellerId, userId)
        ),
        eq(orders.status, status)
      )
    ).orderBy(desc(orders.createdAt));
  }

  const orderData = await query;
  return orderData.map(order => transformDbOrderToApiFormat(order));
}

/**
 * 获取用户订单列表（包含统计）
 * @param userId 用户ID
 * @param status 订单状态（可选）
 * @returns 订单列表和统计
 */
export async function getUserOrdersWithCounts(userId: string, status?: OrderStatus): Promise<{
  list: any[];
  counts: Record<string, number>;
}> {
  let query = db.select().from(orders).where(
    or(
      eq(orders.buyerId, userId),
      eq(orders.sellerId, userId)
    )
  ).orderBy(desc(orders.createdAt));

  if (status) {
    query = db.select().from(orders).where(
      and(
        or(
          eq(orders.buyerId, userId),
          eq(orders.sellerId, userId)
        ),
        eq(orders.status, status)
      )
    ).orderBy(desc(orders.createdAt));
  }

  const orderData = await query;
  const transformedOrders = orderData.map(order => transformDbOrderToApiFormat(order));

  // 计算各状态数量
  const counts: Record<string, number> = {};
  const allOrdersQuery = db.select().from(orders).where(
    or(
      eq(orders.buyerId, userId),
      eq(orders.sellerId, userId)
    )
  );
  const allOrders = await allOrdersQuery;
  
  allOrders.forEach(order => {
    const status = order.status || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
  });

  return {
    list: transformedOrders,
    counts
  };
}

/**
 * 获取所有订单列表（管理员）
 * @param status 订单状态（可选）
 * @returns 订单列表
 */
export async function getAllOrders(status?: OrderStatus): Promise<Order[]> {
  let query;
  
  if (status) {
    query = db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.createdAt));
  } else {
    query = db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  const orderData = await query;
  return orderData.map(order => transformDbOrderToOrder(order));
}
