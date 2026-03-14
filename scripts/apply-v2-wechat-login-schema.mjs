import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const rootDir = process.cwd();
const envFiles = ['.env.local', '.env.production'];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) {
      continue;
    }

    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }

    const [, key, input] = match;
    let value = input;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

for (const envFile of envFiles) {
  loadEnvFile(path.join(rootDir, envFile));
}

const databaseUrl = process.env.PGDATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Missing PGDATABASE_URL or DATABASE_URL.');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 5,
  connect_timeout: 10,
});

try {
  await sql.unsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS wechat_mp_openid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS wechat_open_platform_openid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS wechat_unionid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS wechat_nickname VARCHAR(100),
    ADD COLUMN IF NOT EXISTS wechat_avatar VARCHAR(500);
  `);

  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_wechat_openid_unique
    ON users(wechat_openid)
    WHERE wechat_openid IS NOT NULL;
  `);

  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_wechat_mp_openid_unique
    ON users(wechat_mp_openid)
    WHERE wechat_mp_openid IS NOT NULL;
  `);

  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_wechat_open_platform_openid_unique
    ON users(wechat_open_platform_openid)
    WHERE wechat_open_platform_openid IS NOT NULL;
  `);

  console.log('Applied V2 WeChat login schema successfully.');
} finally {
  await sql.end({ timeout: 1 });
}
