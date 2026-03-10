-- 添加订单验收相关字段
-- 执行时间：2025-01-14

ALTER TABLE orders
ADD COLUMN verification_request_time TIMESTAMP,
ADD COLUMN verification_deadline TIMESTAMP,
ADD COLUMN verification_result VARCHAR(20) DEFAULT 'pending',
ADD COLUMN verification_remark TEXT,
ADD COLUMN dispute_evidence JSONB;

-- 添加索引
CREATE INDEX IF NOT EXISTS orders_verification_result_idx
ON orders(verification_result);

CREATE INDEX IF NOT EXISTS orders_verification_deadline_idx
ON orders(verification_deadline);

-- 添加注释
COMMENT ON COLUMN orders.verification_request_time IS '买家归还账号的时间（验收请求时间）';
COMMENT ON COLUMN orders.verification_deadline IS '验收截止时间（48小时后）';
COMMENT ON COLUMN orders.verification_result IS '验收结果：pending-待验收，passed-通过，rejected-拒绝';
COMMENT ON COLUMN orders.verification_remark IS '验收备注';
COMMENT ON COLUMN orders.dispute_evidence IS '纠纷证据（JSON格式）';
