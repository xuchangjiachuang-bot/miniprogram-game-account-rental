-- 创建提现申请表
CREATE TABLE IF NOT EXISTS withdrawals (
  id VARCHAR(36) PRIMARY KEY,
  withdrawal_no VARCHAR(32) UNIQUE NOT NULL COMMENT '提现单号',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  user_type VARCHAR(10) NOT NULL COMMENT '用户类型：buyer买家/seller卖家',

  -- 提现信息
  amount DECIMAL(10, 2) NOT NULL COMMENT '提现金额',
  fee DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '手续费',
  actual_amount DECIMAL(10, 2) NOT NULL COMMENT '实际到账金额',

  -- 提现方式
  withdrawal_type VARCHAR(20) NOT NULL COMMENT '提现方式：wechat微信/alipay支付宝/bank银行卡',
  account_info JSON COMMENT '账户信息',

  -- 状态信息
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending待审核/approved已通过/rejected已拒绝/completed已完成/cancelled已取消',

  -- 审核信息
  admin_id VARCHAR(36) COMMENT '审核管理员ID',
  admin_remark TEXT COMMENT '审核备注',
  reviewed_at TIMESTAMP COMMENT '审核时间',

  -- 第三方信息
  third_party_no VARCHAR(64) COMMENT '第三方流水号',
  third_party_data JSON COMMENT '第三方返回数据',

  -- 备注信息
  remark TEXT COMMENT '用户备注',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  INDEX idx_withdrawal_no (withdrawal_no),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现申请表';

-- 创建实名认证表
CREATE TABLE IF NOT EXISTS real_name_verifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE NOT NULL COMMENT '用户ID',

  -- 真实信息
  real_name VARCHAR(50) NOT NULL COMMENT '真实姓名',
  id_card VARCHAR(18) NOT NULL COMMENT '身份证号',
  id_card_front VARCHAR(500) COMMENT '身份证正面照片URL',
  id_card_back VARCHAR(500) COMMENT '身份证背面照片URL',

  -- 状态信息
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending待审核/approved已通过/rejected已拒绝',

  -- 审核信息
  admin_id VARCHAR(36) COMMENT '审核管理员ID',
  admin_remark TEXT COMMENT '审核备注',
  reviewed_at TIMESTAMP COMMENT '审核时间',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实名认证表';

-- 为用户表添加实名认证相关字段（如果不存在）
ALTER TABLE users
ADD COLUMN IF NOT EXISTS real_name_verified BOOLEAN DEFAULT FALSE COMMENT '是否实名认证',
ADD COLUMN IF NOT EXISTS real_name VARCHAR(50) COMMENT '真实姓名',
ADD COLUMN IF NOT EXISTS id_card VARCHAR(18) COMMENT '身份证号（加密存储）',
ADD COLUMN IF NOT EXISTS phone VARCHAR(11) COMMENT '手机号',
ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(100) COMMENT '微信openid',
ADD COLUMN IF NOT EXISTS wechat_unionid VARCHAR(100) COMMENT '微信unionid',
ADD COLUMN IF NOT EXISTS wechat_nickname VARCHAR(100) COMMENT '微信昵称',
ADD COLUMN IF NOT EXISTS wechat_avatar VARCHAR(500) COMMENT '微信头像';

-- 创建企业微信客服表
CREATE TABLE IF NOT EXISTS wecom_customer_service (
  id VARCHAR(36) PRIMARY KEY,
  kf_id VARCHAR(64) NOT NULL COMMENT '客服账号ID',
  kf_name VARCHAR(100) NOT NULL COMMENT '客服账号名称',
  kf_account VARCHAR(100) NOT NULL COMMENT '客服账号@微信号',
  kf_headimgurl VARCHAR(500) COMMENT '客服头像',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态：active在线/inactive离线',

  -- 配置信息
  kf_url VARCHAR(500) COMMENT '客服页面URL',
  welcome_message TEXT COMMENT '欢迎语',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_kf_id (kf_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企业微信客服表';

-- 插入默认客服账号
INSERT INTO wecom_customer_service (id, kf_id, kf_name, kf_account, kf_headimgurl, status, welcome_message)
VALUES (
  UUID(),
  'default_kf_001',
  '账号租赁客服',
  'account_rental_kf@wework',
  '',
  'active',
  '您好，欢迎咨询账号租赁相关问题！'
)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
