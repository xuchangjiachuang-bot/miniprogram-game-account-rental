-- ============================================
-- 三角洲行动哈夫币租赁平台 - 数据库表结构
-- ============================================

-- 1. 订单表（优化版）
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(32) UNIQUE NOT NULL COMMENT '订单号',
  account_id VARCHAR(36) NOT NULL COMMENT '账号ID',
  buyer_id VARCHAR(36) NOT NULL COMMENT '买家ID',
  seller_id VARCHAR(36) NOT NULL COMMENT '卖家ID',

  -- 账号信息
  coins_million DECIMAL(10, 2) NOT NULL COMMENT '哈夫币数量（百万为单位）',
  price_ratio DECIMAL(10, 2) NOT NULL COMMENT '比例（1:35，表示35）',
  account_value DECIMAL(10, 2) NOT NULL COMMENT '账号价值',

  -- 金额信息
  rent_amount DECIMAL(10, 2) NOT NULL COMMENT '租金金额',
  deposit_amount DECIMAL(10, 2) NOT NULL COMMENT '押金金额',
  total_amount DECIMAL(10, 2) NOT NULL COMMENT '订单总金额（租金+押金）',

  -- 租期信息
  rent_hours DECIMAL(10, 2) NOT NULL COMMENT '租期（小时）',

  -- 分账信息
  platform_commission DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '平台佣金',
  seller_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '卖家应得金额',
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 5 COMMENT '佣金比例（%）',

  -- 订单状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '订单状态：pending待支付/paid已支付/active租赁中/completed已完成/disputed争议中/refunding退款中/refunded已退款/cancelled已取消',

  -- 时间信息
  start_time TIMESTAMP NULL COMMENT '计划开始时间',
  end_time TIMESTAMP NULL COMMENT '计划结束时间',
  actual_start_time TIMESTAMP NULL COMMENT '实际开始时间',
  actual_end_time TIMESTAMP NULL COMMENT '实际结束时间',

  -- 退款信息
  refund_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '退款金额',
  refund_type VARCHAR(20) DEFAULT 'none' COMMENT '退款类型：none无/full全额/partial部分/deposit_only仅退押金',
  refund_status VARCHAR(20) DEFAULT 'none' COMMENT '退款状态：none无/requested已申请/approved已批准/rejected已拒绝/completed已完成',
  refund_reason TEXT COMMENT '退款原因',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  INDEX idx_order_no (order_no),
  INDEX idx_buyer_id (buyer_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 2. 用户余额表
CREATE TABLE IF NOT EXISTS user_balances (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE NOT NULL COMMENT '用户ID',
  user_type VARCHAR(10) NOT NULL COMMENT '用户类型：buyer买家/seller卖家',

  -- 余额信息
  available_balance DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '可用余额',
  frozen_balance DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '冻结余额',
  total_balance DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '总余额',

  -- 统计信息
  total_withdrawn DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '累计提现',
  total_recharged DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '累计充值',
  total_income DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '累计收入',
  total_refund DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '累计退款',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_user_type (user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户余额表';

-- 3. 余额变动记录表
CREATE TABLE IF NOT EXISTS balance_transactions (
  id VARCHAR(36) PRIMARY KEY,
  transaction_no VARCHAR(32) UNIQUE NOT NULL COMMENT '交易号',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',

  -- 交易信息
  transaction_type VARCHAR(20) NOT NULL COMMENT '交易类型：deposit充值/withdraw提现/refund退款/income收入/penalty扣款/deposit_refund押金退还/deposit_freeze押金冻结/deposit_unfreeze押金解冻',
  amount DECIMAL(10, 2) NOT NULL COMMENT '变动金额（正数增加，负数减少）',

  -- 余额快照
  balance_before DECIMAL(10, 2) NOT NULL COMMENT '变动前余额',
  balance_after DECIMAL(10, 2) NOT NULL COMMENT '变动后余额',
  available_balance_before DECIMAL(10, 2) NOT NULL COMMENT '变动前可用余额',
  available_balance_after DECIMAL(10, 2) NOT NULL COMMENT '变动后可用余额',
  frozen_balance_before DECIMAL(10, 2) NOT NULL COMMENT '变动前冻结余额',
  frozen_balance_after DECIMAL(10, 2) NOT NULL COMMENT '变动后冻结余额',

  -- 关联信息
  related_order_id VARCHAR(36) COMMENT '关联订单ID',
  related_withdrawal_id VARCHAR(36) COMMENT '关联提现ID',
  related_refund_id VARCHAR(36) COMMENT '关联退款ID',
  related_payment_id VARCHAR(36) COMMENT '关联支付ID',

  -- 备注信息
  remark VARCHAR(255) COMMENT '备注',
  extra_data JSON COMMENT '额外数据',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_transaction_no (transaction_no),
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_related_order_id (related_order_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='余额变动记录表';

-- 4. 售后申请表
CREATE TABLE IF NOT EXISTS refund_requests (
  id VARCHAR(36) PRIMARY KEY,
  request_no VARCHAR(32) UNIQUE NOT NULL COMMENT '申请单号',
  order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
  user_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  user_type VARCHAR(10) NOT NULL COMMENT '申请人类型：buyer买家/seller卖家',

  -- 申请信息
  request_type VARCHAR(20) NOT NULL COMMENT '申请类型：full全额退款/partial部分退款/deposit_only仅退押金/penalty申请扣款',
  refund_amount DECIMAL(10, 2) NOT NULL COMMENT '申请退款金额',
  refund_ratio DECIMAL(5, 2) COMMENT '退款比例（仅部分退款时使用）',

  -- 原因信息
  reason TEXT NOT NULL COMMENT '申请原因',
  evidence_urls JSON COMMENT '证据图片URL列表',

  -- 审核信息
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态：pending待审核/approved已批准/rejected已拒绝/cancelled已取消',
  admin_id VARCHAR(36) COMMENT '审核管理员ID',
  admin_remark TEXT COMMENT '审核备注',

  -- 处理信息
  actual_refund_amount DECIMAL(10, 2) COMMENT '实际退款金额',
  actual_penalize_amount DECIMAL(10, 2) COMMENT '实际扣款金额',
  processed_at TIMESTAMP COMMENT '处理时间',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_request_no (request_no),
  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='售后申请表';

-- 5. 支付记录表
CREATE TABLE IF NOT EXISTS payment_records (
  id VARCHAR(36) PRIMARY KEY,
  payment_no VARCHAR(32) UNIQUE NOT NULL COMMENT '支付单号',
  order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
  user_id VARCHAR(36) NOT NULL COMMENT '支付用户ID',

  -- 支付信息
  payment_type VARCHAR(20) NOT NULL COMMENT '支付类型：wechat微信/alipay支付宝/bank银行卡',
  amount DECIMAL(10, 2) NOT NULL COMMENT '支付金额',

  -- 状态信息
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '支付状态：pending待支付/success成功/failed失败/refunded已退款',

  -- 第三方支付信息
  third_party_no VARCHAR(64) COMMENT '第三方支付单号',
  transaction_id VARCHAR(64) COMMENT '第三方交易ID',

  -- 回调信息
  callback_data JSON COMMENT '支付回调数据',
  callback_at TIMESTAMP NULL COMMENT '回调时间',

  -- 退款信息
  refund_no VARCHAR(32) COMMENT '退款单号',
  refund_status VARCHAR(20) DEFAULT 'none' COMMENT '退款状态：none无/refunding退款中/refunded已退款',
  refund_amount DECIMAL(10, 2) COMMENT '退款金额',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_payment_no (payment_no),
  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';

-- 6. 分账记录表
CREATE TABLE IF NOT EXISTS split_records (
  id VARCHAR(36) PRIMARY KEY,
  split_no VARCHAR(32) UNIQUE NOT NULL COMMENT '分账单号',
  order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
  order_no VARCHAR(32) NOT NULL COMMENT '订单号',

  -- 分账信息
  split_type VARCHAR(20) NOT NULL COMMENT '分账类型：normal正常/refund退款/penalty扣款',
  total_amount DECIMAL(10, 2) NOT NULL COMMENT '分账总金额',

  -- 平台分账
  platform_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '平台分得金额',
  platform_ratio DECIMAL(5, 2) NOT NULL COMMENT '平台分账比例',

  -- 卖家分账
  seller_id VARCHAR(36) NOT NULL COMMENT '卖家ID',
  seller_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '卖家分得金额',
  seller_ratio DECIMAL(5, 2) NOT NULL COMMENT '卖家分账比例',

  -- 买家分账
  buyer_id VARCHAR(36) NOT NULL COMMENT '买家ID',
  buyer_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '买家分得金额（押金退还等）',

  -- 状态信息
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '分账状态：pending待处理/success成功/failed失败',

  -- 第三方分账信息
  third_party_split_id VARCHAR(64) COMMENT '第三方分账ID',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_split_no (split_no),
  INDEX idx_order_id (order_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_buyer_id (buyer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分账记录表';

-- 7. 账号表
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(36) PRIMARY KEY,
  account_no VARCHAR(32) UNIQUE NOT NULL COMMENT '账号编号',
  seller_id VARCHAR(36) NOT NULL COMMENT '卖家ID',

  -- 账号信息
  game_account VARCHAR(100) NOT NULL COMMENT '游戏账号',
  coins_million DECIMAL(10, 2) NOT NULL COMMENT '哈夫币数量（百万为单位）',
  price_ratio DECIMAL(10, 2) NOT NULL COMMENT '比例（1:35，表示35）',
  account_value DECIMAL(10, 2) NOT NULL COMMENT '账号价值',

  -- 状态信息
  status VARCHAR(20) NOT NULL DEFAULT 'available' COMMENT '状态：available可租赁/rented租赁中/unavailable不可用',

  -- 统计信息
  total_rentals INT NOT NULL DEFAULT 0 COMMENT '累计租赁次数',
  total_income DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '累计收入',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  INDEX idx_account_no (account_no),
  INDEX idx_seller_id (seller_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账号表';

-- 8. 平台配置表
CREATE TABLE IF NOT EXISTS platform_config (
  id VARCHAR(36) PRIMARY KEY,
  config_key VARCHAR(50) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT NOT NULL COMMENT '配置值',
  config_type VARCHAR(20) NOT NULL COMMENT '配置类型：string字符串/number数字/boolean布尔/array数组/object对象',
  description VARCHAR(255) COMMENT '配置描述',
  category VARCHAR(50) COMMENT '配置分类：commission佣金/withdrawal提现/deposit押金/rental租金',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_config_key (config_key),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台配置表';

-- 插入默认配置
INSERT INTO platform_config (id, config_key, config_value, config_type, description, category) VALUES
  (UUID(), 'commission_rate', '5', 'number', '平台佣金比例（%）', 'commission'),
  (UUID(), 'withdrawal_fee_ratio', '1', 'number', '提现手续费比例（%）', 'withdrawal'),
  (UUID(), 'min_rental_price', '50', 'number', '最低租金（元）', 'rental'),
  (UUID(), 'deposit_ratio', '50', 'number', '押金比例（%）', 'deposit'),
  (UUID(), 'min_withdrawal_amount', '10', 'number', '最低提现金额（元）', 'withdrawal'),
  (UUID(), 'max_deposit', '10000', 'number', '最大押金（元）', 'deposit'),
  (UUID(), 'coins_per_day', '10', 'number', '每10M对应租期（天）', 'rental'),
  (UUID(), 'min_rental_hours', '24', 'number', '最低租期（小时）', 'rental'),
  (UUID(), 'max_coins_per_account', '1000', 'number', '单账号最大哈夫币（M）', 'rental')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
