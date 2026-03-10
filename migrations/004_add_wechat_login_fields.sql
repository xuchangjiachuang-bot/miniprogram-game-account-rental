-- 为 users 表添加微信小程序登录相关字段
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(100),
ADD COLUMN IF NOT EXISTS wechat_unionid VARCHAR(100),
ADD COLUMN IF NOT EXISTS wechat_nickname VARCHAR(100),
ADD COLUMN IF NOT EXISTS wechat_avatar VARCHAR(500);

-- 为 wechat_openid 添加唯一索引（如果不存在）
CREATE UNIQUE INDEX IF NOT EXISTS users_wechat_openid_unique ON users(wechat_openid) WHERE wechat_openid IS NOT NULL;
