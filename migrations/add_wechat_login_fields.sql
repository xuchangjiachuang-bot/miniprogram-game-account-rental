-- 为平台设置表添加微信登录配置字段
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS wechat_mp_app_id VARCHAR(100);
COMMENT ON COLUMN platform_settings.wechat_mp_app_id IS '微信公众号 AppID';

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS wechat_mp_app_secret VARCHAR(100);
COMMENT ON COLUMN platform_settings.wechat_mp_app_secret IS '微信公众号 AppSecret';

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS wechat_open_app_id VARCHAR(100);
COMMENT ON COLUMN platform_settings.wechat_open_app_id IS '微信开放平台 AppID';

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS wechat_open_app_secret VARCHAR(100);
COMMENT ON COLUMN platform_settings.wechat_open_app_secret IS '微信开放平台 AppSecret';

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS wechat_token VARCHAR(100);
COMMENT ON COLUMN platform_settings.wechat_token IS '微信服务器验证用的 Token';

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS wechat_encoding_aes_key VARCHAR(100);
COMMENT ON COLUMN platform_settings.wechat_encoding_aes_key IS '消息加解密密钥（可选）';
