-- ============================================
-- 数据库迁移脚本
-- 版本: v1.0.0 -> v1.1.0
-- 说明: 添加自动分账、订单超时、账号审核、上架保证金功能
-- ============================================

-- 1. 修改 users 表：删除重复字段
-- ============================================

-- 检查字段是否存在，存在则删除
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'balance'
    ) THEN
        ALTER TABLE users DROP COLUMN balance;
        RAISE NOTICE '已删除 users.balance 字段';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'frozen_balance'
    ) THEN
        ALTER TABLE users DROP COLUMN frozen_balance;
        RAISE NOTICE '已删除 users.frozen_balance 字段';
    END IF;
END $$;

-- 2. 修改 accounts 表：添加审核和保证金字段
-- ============================================

-- 添加审核相关字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts' AND column_name = 'audit_status'
    ) THEN
        ALTER TABLE accounts ADD COLUMN audit_status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE '已添加 accounts.audit_status 字段';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts' AND column_name = 'audit_reason'
    ) THEN
        ALTER TABLE accounts ADD COLUMN audit_reason TEXT;
        RAISE NOTICE '已添加 accounts.audit_reason 字段';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts' AND column_name = 'audit_user_id'
    ) THEN
        ALTER TABLE accounts ADD COLUMN audit_user_id UUID;
        RAISE NOTICE '已添加 accounts.audit_user_id 字段';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts' AND column_name = 'audit_time'
    ) THEN
        ALTER TABLE accounts ADD COLUMN audit_time TIMESTAMP;
        RAISE NOTICE '已添加 accounts.audit_time 字段';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts' AND column_name = 'deposit_id'
    ) THEN
        ALTER TABLE accounts ADD COLUMN deposit_id UUID;
        RAISE NOTICE '已添加 accounts.deposit_id 字段';
    END IF;
END $$;

-- 添加审核状态索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'accounts_audit_status_idx'
    ) THEN
        CREATE INDEX accounts_audit_status_idx ON accounts(audit_status);
        RAISE NOTICE '已创建 accounts_audit_status_idx 索引';
    END IF;
END $$;

-- 3. 修改 platform_settings 表：添加配置字段
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'platform_settings' AND column_name = 'listing_deposit_amount'
    ) THEN
        ALTER TABLE platform_settings ADD COLUMN listing_deposit_amount NUMERIC(10, 2) DEFAULT 50.00;
        RAISE NOTICE '已添加 platform_settings.listing_deposit_amount 字段';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'platform_settings' AND column_name = 'order_payment_timeout'
    ) THEN
        ALTER TABLE platform_settings ADD COLUMN order_payment_timeout INTEGER DEFAULT 1800;
        RAISE NOTICE '已添加 platform_settings.order_payment_timeout 字段';
    END IF;
END $$;

-- 4. 创建群聊相关表
-- ============================================

-- 群聊组表
CREATE TABLE IF NOT EXISTS chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(100) NOT NULL,
    group_type VARCHAR(20) DEFAULT 'order',
    related_order_id UUID,
    related_platform_id UUID,
    creator_id UUID NOT NULL,
    max_members INTEGER DEFAULT 10,
    avatar VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 群聊组索引
CREATE INDEX IF NOT EXISTS chat_groups_group_type_idx ON chat_groups(group_type);
CREATE INDEX IF NOT EXISTS chat_groups_related_order_id_idx ON chat_groups(related_order_id);
CREATE INDEX IF NOT EXISTS chat_groups_creator_id_idx ON chat_groups(creator_id);

-- 群聊组外键
ALTER TABLE chat_groups ADD CONSTRAINT chat_groups_creator_id_users_id_fk
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;

-- 群聊成员表
CREATE TABLE IF NOT EXISTS chat_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    muted_until TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- 群聊成员索引
CREATE INDEX IF NOT EXISTS chat_group_members_group_id_idx ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS chat_group_members_user_id_idx ON chat_group_members(user_id);

-- 群聊成员外键
ALTER TABLE chat_group_members ADD CONSTRAINT chat_group_members_group_id_chat_groups_id_fk
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE;
ALTER TABLE chat_group_members ADD CONSTRAINT chat_group_members_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id);

-- 群聊消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    content TEXT,
    attachments JSONB,
    reply_to UUID,
    is_deleted BOOLEAN DEFAULT false,
    deleted_by UUID,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 群聊消息索引
CREATE INDEX IF NOT EXISTS chat_messages_group_id_idx ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);

-- 群聊消息外键
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_group_id_chat_groups_id_fk
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id);

-- 5. 创建账号保证金记录表
-- ============================================

CREATE TABLE IF NOT EXISTS account_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'frozen',
    refund_reason VARCHAR(50),
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 保证金记录索引
CREATE INDEX IF NOT EXISTS account_deposits_account_id_idx ON account_deposits(account_id);
CREATE INDEX IF NOT EXISTS account_deposits_user_id_idx ON account_deposits(user_id);
CREATE INDEX IF NOT EXISTS account_deposits_status_idx ON account_deposits(status);

-- 保证金记录外键
ALTER TABLE account_deposits ADD CONSTRAINT account_deposits_account_id_accounts_id_fk
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE account_deposits ADD CONSTRAINT account_deposits_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id);

-- 添加保证金外键到 accounts 表
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts' AND column_name = 'deposit_id'
    ) THEN
        ALTER TABLE accounts ADD CONSTRAINT accounts_deposit_id_account_deposits_id_fk
            FOREIGN KEY (deposit_id) REFERENCES account_deposits(id) ON DELETE SET NULL;
        RAISE NOTICE '已添加 accounts.deposit_id 外键约束';
    END IF;
END $$;

-- 6. 更新现有数据
-- ============================================

-- 将所有现有的账号设置为已审核通过状态
UPDATE accounts SET audit_status = 'approved' WHERE audit_status = 'pending' AND status = 'available';

-- 更新 platform_settings 表，插入默认配置（如果不存在）
INSERT INTO platform_settings (id, commission_rate, min_commission, max_commission, withdrawal_fee,
    min_rental_price, deposit_ratio, coins_per_day, min_rental_hours, max_coins_per_account,
    max_deposit, require_manual_review, auto_approve_verified, listing_deposit_amount, order_payment_timeout)
VALUES (
    gen_random_uuid(),
    5.00, 0.00, 100.00, 1.00,
    50.00, 50.00, 10.0, 24, 1000.0,
    10000.00, true, false, 50.00, 1800
)
ON CONFLICT DO NOTHING;

-- 7. 创建视图（可选，便于查询）
-- ============================================

-- 账号详情视图（包含保证金信息）
CREATE OR REPLACE VIEW account_details_with_deposit AS
SELECT
    a.*,
    ad.id as deposit_record_id,
    ad.amount as deposit_amount,
    ad.status as deposit_status,
    ad.refund_reason,
    ad.refunded_at
FROM accounts a
LEFT JOIN account_deposits ad ON a.deposit_id = ad.id;

-- 8. 数据验证
-- ============================================

-- 验证 user_balances 表存在且有数据
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_balances') THEN
        RAISE EXCEPTION 'user_balances 表不存在，请先创建该表';
    END IF;
END $$;

-- 验证 split_records 表存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'split_records') THEN
        RAISE EXCEPTION 'split_records 表不存在，请先创建该表';
    END IF;
END $$;

-- ============================================
-- 迁移完成
-- ============================================

-- 输出迁移完成信息
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '数据库迁移完成！';
    RAISE NOTICE '版本: v1.0.0 -> v1.1.0';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已完成的功能:';
    RAISE NOTICE '1. 删除 users 表的重复字段（balance, frozen_balance）';
    RAISE NOTICE '2. 添加 accounts 表的审核和保证金字段';
    RAISE NOTICE '3. 添加 platform_settings 表的配置字段';
    RAISE NOTICE '4. 创建群聊相关表（chat_groups, chat_group_members, chat_messages）';
    RAISE NOTICE '5. 创建账号保证金记录表（account_deposits）';
    RAISE NOTICE '6. 更新现有数据为已审核通过状态';
    RAISE NOTICE '7. 创建账号详情视图（account_details_with_deposit）';
    RAISE NOTICE '========================================';
END $$;
