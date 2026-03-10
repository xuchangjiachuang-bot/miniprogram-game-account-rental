-- 为企业微信客服配置表添加客服链接字段
ALTER TABLE wecom_customer_service ADD COLUMN kf_url VARCHAR(500);
COMMENT ON COLUMN wecom_customer_service.kf_url IS '企业微信客服链接，格式：https://work.weixin.qq.com/kfid/kfcXXXXX';
