import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const rootDir = process.cwd();
const envFiles = ['.env.local', '.env.production'];
const requiredColumns = [
  'wechat_openid',
  'wechat_mp_openid',
  'wechat_open_platform_openid',
  'wechat_unionid',
  'wechat_nickname',
  'wechat_avatar',
];
const requiredIndexes = [
  'users_wechat_openid_unique',
  'users_wechat_mp_openid_unique',
  'users_wechat_open_platform_openid_unique',
];

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
const baseUrl = (process.env.V2_CHECK_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const results = [];
const warnings = [];
const failures = [];

function record(section, status, detail) {
  results.push({ section, status, detail });
}

async function checkDatabase() {
  if (!databaseUrl) {
    failures.push('Missing PGDATABASE_URL or DATABASE_URL.');
    return;
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    const columns = await sql`
      select column_name
      from information_schema.columns
      where table_name = 'users'
        and column_name in ${sql(requiredColumns)}
      order by column_name
    `;

    const foundColumns = new Set(columns.map((row) => row.column_name));
    const missingColumns = requiredColumns.filter((column) => !foundColumns.has(column));
    if (missingColumns.length > 0) {
      failures.push(`users table is missing columns: ${missingColumns.join(', ')}`);
    } else {
      record('database.columns', 'pass', `users table contains all V2 login columns.`);

      const indexes = await sql`
        select indexname
        from pg_indexes
        where tablename = 'users'
          and indexname in ${sql(requiredIndexes)}
        order by indexname
      `;

      const foundIndexes = new Set(indexes.map((row) => row.indexname));
      const missingIndexes = requiredIndexes.filter((indexName) => !foundIndexes.has(indexName));
      if (missingIndexes.length > 0) {
        failures.push(`users table is missing indexes: ${missingIndexes.join(', ')}`);
      } else {
        record('database.indexes', 'pass', `users table contains all V2 login indexes.`);
      }

      const duplicateMpOpenids = await sql`
        select wechat_mp_openid as openid, count(*)::int as count
        from users
        where wechat_mp_openid is not null
        group by wechat_mp_openid
        having count(*) > 1
      `;
      if (duplicateMpOpenids.length > 0) {
        failures.push(`Found duplicate wechat_mp_openid rows: ${duplicateMpOpenids.length}`);
      } else {
        record('database.duplicate-mp-openid', 'pass', 'No duplicate mp openid rows found.');
      }

      const duplicateOpenPlatformOpenids = await sql`
        select wechat_open_platform_openid as openid, count(*)::int as count
        from users
        where wechat_open_platform_openid is not null
        group by wechat_open_platform_openid
        having count(*) > 1
      `;
      if (duplicateOpenPlatformOpenids.length > 0) {
        failures.push(`Found duplicate wechat_open_platform_openid rows: ${duplicateOpenPlatformOpenids.length}`);
      } else {
        record('database.duplicate-open-platform-openid', 'pass', 'No duplicate open platform openid rows found.');
      }

      const unionidCollisions = await sql`
        select
          wechat_unionid as unionid,
          count(*)::int as user_count,
          count(distinct coalesce(wechat_mp_openid, wechat_openid))::int as mp_identities,
          count(distinct wechat_open_platform_openid)::int as open_platform_identities
        from users
        where wechat_unionid is not null
        group by wechat_unionid
        having count(*) > 1
      `;

      if (unionidCollisions.length > 0) {
        warnings.push(
          `Found ${unionidCollisions.length} unionid collision group(s). This does not block deploy, but these are historical duplicates to monitor.`
        );
        record(
          'database.unionid-collisions',
          'warn',
          `Detected ${unionidCollisions.length} unionid collision group(s).`
        );
      } else {
        record('database.unionid-collisions', 'pass', 'No multi-row unionid collisions found.');
      }
    }
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function checkHttpConfig() {
  const endpoint = `${baseUrl}/api/v2/auth/wechat/config`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        accept: 'application/json',
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      failures.push(`V2 config endpoint failed: ${response.status}`);
      return;
    }

    const pcEnabled = Boolean(payload?.data?.pc?.enabled);
    const oauthEnabled = Boolean(payload?.data?.oauth?.enabled);
    const callbackUri = payload?.data?.callbackUri;

    if (!pcEnabled || !oauthEnabled) {
      failures.push(`V2 config endpoint is not fully enabled. pc=${pcEnabled}, oauth=${oauthEnabled}`);
      return;
    }

    record(
      'http.v2-config',
      'pass',
      `V2 config endpoint ok. callbackUri=${callbackUri || 'missing'} buildMarker=${payload?.data?.buildMarker || 'n/a'}`
    );
  } catch (error) {
    warnings.push(
      `Skipped HTTP config check because ${endpoint} is not reachable. Start the local app or set V2_CHECK_BASE_URL to a running instance.`
    );
    record('http.v2-config', 'skip', `Endpoint not reachable at ${endpoint}.`);
  }
}

await checkDatabase();
await checkHttpConfig();

for (const result of results) {
  console.log(`[${result.status}] ${result.section} - ${result.detail}`);
}

if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error('\nFailures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nV2 WeChat login preflight passed.');
