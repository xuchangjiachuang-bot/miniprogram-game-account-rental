/**
 * 钱包余额管理服务
 * 处理用户余额的查询、冻结、解冻、变动等操作
 */

// ==================== 类型定义 ====================

// 用户类型
export type UserType = 'buyer' | 'seller';

// 交易类型
export enum TransactionType {
  DEPOSIT = 'deposit',                 // 充值
  WITHDRAW = 'withdraw',               // 提现
  REFUND = 'refund',                   // 退款
  INCOME = 'income',                   // 收入
  PENALTY = 'penalty',                 // 扣款
  DEPOSIT_REFUND = 'deposit_refund',   // 押金退还
  DEPOSIT_FREEZE = 'deposit_freeze',   // 押金冻结
  DEPOSIT_UNFREEZE = 'deposit_unfreeze', // 押金解冻
  COMMISSION = 'commission',           // 佣金
  RENT_INCOME = 'rent_income',         // 租金收入
  PLATFORM_INCOME = 'platform_income'  // 平台收入
}

// 用户余额信息
export interface UserBalance {
  id: string;
  user_id: string;
  user_type: UserType;
  available_balance: number;
  frozen_balance: number;
  total_balance: number;
  total_withdrawn: number;
  total_recharged: number;
  total_income: number;
  total_refund: number;
  created_at: Date;
  updated_at: Date;
}

// 余额变动记录
export interface BalanceTransaction {
  id: string;
  transaction_no: string;
  user_id: string;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  available_balance_before: number;
  available_balance_after: number;
  frozen_balance_before: number;
  frozen_balance_after: number;
  related_order_id?: string;
  related_withdrawal_id?: string;
  related_refund_id?: string;
  related_payment_id?: string;
  remark?: string;
  extra_data?: any;
  created_at: Date;
}

// 余额变动参数
export interface ChangeBalanceParams {
  user_id: string;
  user_type: UserType;
  amount: number;
  transaction_type: TransactionType;
  remark?: string;
  related_order_id?: string;
  related_withdrawal_id?: string;
  related_refund_id?: string;
  related_payment_id?: string;
  extra_data?: any;
}

// 冻结/解冻参数
export interface FreezeParams {
  user_id: string;
  user_type: UserType;
  amount: number;
  transaction_type: TransactionType.DEPOSIT_FREEZE | TransactionType.DEPOSIT_UNFREEZE;
  remark?: string;
  related_order_id?: string;
}

// ==================== 工具函数 ====================

/**
 * 生成交易号
 * @returns 交易号
 */
export function generateTransactionNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `TXN${timestamp}${random}`;
}

/**
 * 格式化金额
 * @param amount 金额
 * @returns 格式化后的金额
 */
export function formatBalance(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

/**
 * 获取交易类型文本
 * @param type 交易类型
 * @returns 类型文本
 */
export function getTransactionTypeText(type: TransactionType): string {
  const typeMap: Record<TransactionType, string> = {
    [TransactionType.DEPOSIT]: '充值',
    [TransactionType.WITHDRAW]: '提现',
    [TransactionType.REFUND]: '退款',
    [TransactionType.INCOME]: '收入',
    [TransactionType.PENALTY]: '扣款',
    [TransactionType.DEPOSIT_REFUND]: '押金退还',
    [TransactionType.DEPOSIT_FREEZE]: '押金冻结',
    [TransactionType.DEPOSIT_UNFREEZE]: '押金解冻',
    [TransactionType.COMMISSION]: '平台佣金',
    [TransactionType.RENT_INCOME]: '租金收入',
    [TransactionType.PLATFORM_INCOME]: '平台收入'
  };
  return typeMap[type] || '未知';
}

// ==================== 模拟数据库 ====================

// 模拟用户余额数据
const mockUserBalances: Map<string, UserBalance> = new Map([
  [
    'U001',
    {
      id: 'BAL001',
      user_id: 'U001',
      user_type: 'buyer',
      available_balance: 500,
      frozen_balance: 100,
      total_balance: 600,
      total_withdrawn: 200,
      total_recharged: 800,
      total_income: 0,
      total_refund: 0,
      created_at: new Date('2026-01-01'),
      updated_at: new Date()
    }
  ],
  [
    'U002',
    {
      id: 'BAL002',
      user_id: 'U002',
      user_type: 'seller',
      available_balance: 2000,
      frozen_balance: 0,
      total_balance: 2000,
      total_withdrawn: 500,
      total_recharged: 0,
      total_income: 3000,
      total_refund: 0,
      created_at: new Date('2026-01-01'),
      updated_at: new Date()
    }
  ]
]);

// 模拟余额变动记录
const mockTransactions: BalanceTransaction[] = [];

// ==================== 余额管理服务 ====================

/**
 * 获取用户余额
 * @param userId 用户ID
 * @returns 用户余额信息
 */
export function getUserBalance(userId: string): UserBalance | null {
  const balance = mockUserBalances.get(userId);

  if (!balance) {
    // 如果用户不存在，创建默认余额
    const newBalance: UserBalance = {
      id: `BAL${Date.now()}`,
      user_id: userId,
      user_type: 'buyer',
      available_balance: 0,
      frozen_balance: 0,
      total_balance: 0,
      total_withdrawn: 0,
      total_recharged: 0,
      total_income: 0,
      total_refund: 0,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockUserBalances.set(userId, newBalance);
    return newBalance;
  }

  return balance;
}

/**
 * 创建用户余额
 * @param userId 用户ID
 * @param userType 用户类型
 * @returns 创建的用户余额
 */
export function createUserBalance(userId: string, userType: UserType): UserBalance {
  const existingBalance = mockUserBalances.get(userId);
  if (existingBalance) {
    return existingBalance;
  }

  const balance: UserBalance = {
    id: `BAL${Date.now()}`,
    user_id: userId,
    user_type: userType,
    available_balance: 0,
    frozen_balance: 0,
    total_balance: 0,
    total_withdrawn: 0,
    total_recharged: 0,
    total_income: 0,
    total_refund: 0,
    created_at: new Date(),
    updated_at: new Date()
  };

  mockUserBalances.set(userId, balance);
  return balance;
}

/**
 * 冻结余额
 * @param params 冻结参数
 * @returns 是否成功
 */
export function freezeBalance(params: FreezeParams): boolean {
  const balance = getUserBalance(params.user_id);

  if (!balance) {
    throw new Error('用户余额不存在');
  }

  if (params.amount <= 0) {
    throw new Error('冻结金额必须大于0');
  }

  if (balance.available_balance < params.amount) {
    throw new Error(`可用余额不足，当前可用：${balance.available_balance}，需要冻结：${params.amount}`);
  }

  const balanceBefore = balance.available_balance;
  const frozenBefore = balance.frozen_balance;

  // 执行冻结
  balance.available_balance -= params.amount;
  balance.frozen_balance += params.amount;
  balance.total_balance = balance.available_balance + balance.frozen_balance;
  balance.updated_at = new Date();

  // 创建交易记录
  const transaction: BalanceTransaction = {
    id: `TXN${Date.now()}`,
    transaction_no: generateTransactionNo(),
    user_id: params.user_id,
    transaction_type: params.transaction_type,
    amount: -params.amount,
    balance_before: balanceBefore + frozenBefore,
    balance_after: balance.total_balance,
    available_balance_before: balanceBefore,
    available_balance_after: balance.available_balance,
    frozen_balance_before: frozenBefore,
    frozen_balance_after: balance.frozen_balance,
    related_order_id: params.related_order_id,
    remark: params.remark || '冻结余额',
    created_at: new Date()
  };

  mockTransactions.push(transaction);

  return true;
}

/**
 * 解冻余额
 * @param params 解冻参数
 * @returns 是否成功
 */
export function unfreezeBalance(params: FreezeParams): boolean {
  const balance = getUserBalance(params.user_id);

  if (!balance) {
    throw new Error('用户余额不存在');
  }

  if (params.amount <= 0) {
    throw new Error('解冻金额必须大于0');
  }

  if (balance.frozen_balance < params.amount) {
    throw new Error(`冻结余额不足，当前冻结：${balance.frozen_balance}，需要解冻：${params.amount}`);
  }

  const balanceBefore = balance.available_balance;
  const frozenBefore = balance.frozen_balance;

  // 执行解冻
  balance.frozen_balance -= params.amount;
  balance.available_balance += params.amount;
  balance.total_balance = balance.available_balance + balance.frozen_balance;
  balance.updated_at = new Date();

  // 创建交易记录
  const transaction: BalanceTransaction = {
    id: `TXN${Date.now()}`,
    transaction_no: generateTransactionNo(),
    user_id: params.user_id,
    transaction_type: params.transaction_type,
    amount: params.amount,
    balance_before: balanceBefore + frozenBefore,
    balance_after: balance.total_balance,
    available_balance_before: balanceBefore,
    available_balance_after: balance.available_balance,
    frozen_balance_before: frozenBefore,
    frozen_balance_after: balance.frozen_balance,
    related_order_id: params.related_order_id,
    remark: params.remark || '解冻余额',
    created_at: new Date()
  };

  mockTransactions.push(transaction);

  return true;
}

/**
 * 变动余额
 * @param params 变动参数
 * @returns 是否成功
 */
export function changeBalance(params: ChangeBalanceParams): boolean {
  const balance = getUserBalance(params.user_id);

  if (!balance) {
    throw new Error('用户余额不存在');
  }

  if (params.amount === 0) {
    throw new Error('变动金额不能为0');
  }

  const balanceBefore = balance.available_balance + balance.frozen_balance;
  const availableBefore = balance.available_balance;
  const frozenBefore = balance.frozen_balance;

  // 更新余额
  if (params.amount > 0) {
    // 增加余额
    balance.available_balance += params.amount;

    // 更新统计信息
    switch (params.transaction_type) {
      case TransactionType.DEPOSIT:
        balance.total_recharged += params.amount;
        break;
      case TransactionType.REFUND:
        balance.total_refund += params.amount;
        break;
      case TransactionType.INCOME:
      case TransactionType.RENT_INCOME:
        balance.total_income += params.amount;
        break;
      case TransactionType.PLATFORM_INCOME:
        balance.total_income += params.amount;
        break;
    }
  } else {
    // 减少余额
    const absAmount = Math.abs(params.amount);

    if (balance.available_balance < absAmount) {
      throw new Error(`可用余额不足，当前可用：${balance.available_balance}，需要扣除：${absAmount}`);
    }

    balance.available_balance -= absAmount;

    // 更新统计信息
    if (params.transaction_type === TransactionType.WITHDRAW) {
      balance.total_withdrawn += absAmount;
    }
  }

  balance.total_balance = balance.available_balance + balance.frozen_balance;
  balance.updated_at = new Date();

  // 创建交易记录
  const transaction: BalanceTransaction = {
    id: `TXN${Date.now()}`,
    transaction_no: generateTransactionNo(),
    user_id: params.user_id,
    transaction_type: params.transaction_type,
    amount: params.amount,
    balance_before: balanceBefore,
    balance_after: balance.total_balance,
    available_balance_before: availableBefore,
    available_balance_after: balance.available_balance,
    frozen_balance_before: frozenBefore,
    frozen_balance_after: balance.frozen_balance,
    related_order_id: params.related_order_id,
    related_withdrawal_id: params.related_withdrawal_id,
    related_refund_id: params.related_refund_id,
    related_payment_id: params.related_payment_id,
    remark: params.remark,
    extra_data: params.extra_data,
    created_at: new Date()
  };

  mockTransactions.push(transaction);

  return true;
}

/**
 * 获取用户交易记录
 * @param userId 用户ID
 * @param limit 限制数量
 * @returns 交易记录列表
 */
export function getUserTransactions(userId: string, limit: number = 50): BalanceTransaction[] {
  return mockTransactions
    .filter(t => t.user_id === userId)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit);
}

/**
 * 检查余额是否足够
 * @param userId 用户ID
 * @param amount 需要的金额
 * @returns 是否足够
 */
export function checkBalance(userId: string, amount: number): boolean {
  const balance = getUserBalance(userId);
  if (!balance) {
    return false;
  }
  return balance.available_balance >= amount;
}

/**
 * 批量变动余额（用于分账场景）
 * @param changes 变动列表
 * @returns 是否成功
 */
export function batchChangeBalance(changes: ChangeBalanceParams[]): boolean {
  try {
    // 先检查所有余额是否足够
    for (const change of changes) {
      if (change.amount < 0) {
        if (!checkBalance(change.user_id, Math.abs(change.amount))) {
          throw new Error(`用户 ${change.user_id} 余额不足`);
        }
      }
    }

    // 执行变动
    for (const change of changes) {
      changeBalance(change);
    }

    return true;
  } catch (error) {
    console.error('批量变动余额失败:', error);
    throw error;
  }
}
