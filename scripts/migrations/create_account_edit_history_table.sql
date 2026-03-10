-- 创建账号编辑历史记录表
CREATE TABLE IF NOT EXISTS account_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL,
    old_data JSONB NOT NULL,
    new_data JSONB NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    changed_fields JSONB DEFAULT '[]'::jsonb,
    reason TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_account_edit_history_account_id ON account_edit_history(account_id);
CREATE INDEX IF NOT EXISTS idx_account_edit_history_seller_id ON account_edit_history(seller_id);
CREATE INDEX IF NOT EXISTS idx_account_edit_history_created_at ON account_edit_history(created_at DESC);

-- 添加注释
COMMENT ON TABLE account_edit_history IS '账号编辑历史记录表';
COMMENT ON COLUMN account_edit_history.change_type IS '变更类型: create, update, delete';
COMMENT ON COLUMN account_edit_history.changed_fields IS '变更的字段列表';
