import { sqlClient } from './db';

let isWechatLoginSchemaInitialized = false;
let schemaInitPromise: Promise<void> | null = null;

export async function ensureWechatLoginSchema() {
  if (isWechatLoginSchemaInitialized) {
    return;
  }

  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      await sqlClient.unsafe(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(100),
        ADD COLUMN IF NOT EXISTS wechat_mp_openid VARCHAR(100),
        ADD COLUMN IF NOT EXISTS wechat_open_platform_openid VARCHAR(100),
        ADD COLUMN IF NOT EXISTS wechat_unionid VARCHAR(100),
        ADD COLUMN IF NOT EXISTS wechat_nickname VARCHAR(100),
        ADD COLUMN IF NOT EXISTS wechat_avatar VARCHAR(500);
      `);

      await sqlClient.unsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_wechat_openid_unique
        ON users(wechat_openid)
        WHERE wechat_openid IS NOT NULL;
      `);

      await sqlClient.unsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_wechat_mp_openid_unique
        ON users(wechat_mp_openid)
        WHERE wechat_mp_openid IS NOT NULL;
      `);

      await sqlClient.unsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_wechat_open_platform_openid_unique
        ON users(wechat_open_platform_openid)
        WHERE wechat_open_platform_openid IS NOT NULL;
      `);

      isWechatLoginSchemaInitialized = true;
    })().catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }

  await schemaInitPromise;
}
