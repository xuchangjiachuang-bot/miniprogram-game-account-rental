import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { chromium, devices } from 'playwright';

const rootDir = process.cwd();
const envFiles = ['.env.local', '.env.production'];
const reportPath = path.join(rootDir, 'tmp', 'wechat-jsapi-sim-report.json');

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

const baseUrl = (process.env.SIM_WECHAT_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://hfb.yugioh.top').replace(/\/$/, '');
const databaseUrl = process.env.PGDATABASE_URL || process.env.DATABASE_URL;
const authSecret =
  process.env.AUTH_TOKEN_SECRET ||
  process.env.WECHAT_MP_SECRET ||
  process.env.WECHAT_OPEN_APPSECRET ||
  'playground-auth-secret';
const rechargeAmount = process.env.SIM_WECHAT_RECHARGE_AMOUNT || '0.10';

if (!databaseUrl) {
  console.error('Missing PGDATABASE_URL or DATABASE_URL.');
  process.exit(1);
}

function toBase64Url(value) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncode(value) {
  return toBase64Url(Buffer.from(value, 'utf8').toString('base64'));
}

function signPayload(payload) {
  return toBase64Url(crypto.createHmac('sha256', authSecret).update(payload).digest('base64'));
}

function generateToken(userId) {
  const payload = base64UrlEncode(JSON.stringify({
    userId,
    version: 1,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  }));
  const signature = signPayload(payload);
  return `1.${payload}.${signature}`;
}

async function getSimulatedUser() {
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    const rows = await sql`
      select id, phone, nickname, wechat_openid, wechat_mp_openid, wechat_unionid
      from users
      where is_deleted = false
        and status = 'active'
        and (wechat_mp_openid is not null or wechat_openid is not null)
      order by updated_at desc nulls last
      limit 1
    `;

    if (!rows.length) {
      throw new Error('No active user with wechat openid found.');
    }

    return rows[0];
  } finally {
    await sql.end({ timeout: 1 });
  }
}

const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  rechargeAmount,
  user: null,
  authMe: null,
  paymentConfig: null,
  pageErrors: [],
  consoleErrors: [],
  httpEvents: [],
  final: null,
};

const user = await getSimulatedUser();
const token = generateToken(user.id);
report.user = {
  id: user.id,
  phone: user.phone,
  nickname: user.nickname,
  wechatOpenid: user.wechat_openid,
  wechatMpOpenid: user.wechat_mp_openid,
  hasUnionId: Boolean(user.wechat_unionid),
};

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'zh-CN',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.48 NetType/WIFI Language/zh_CN',
  });

  await context.addCookies([
    {
      name: 'auth_token',
      value: token,
      domain: new URL(baseUrl).hostname,
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  page.on('pageerror', (error) => {
    report.pageErrors.push(error.message);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      report.consoleErrors.push(message.text());
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.startsWith(baseUrl)) {
      return;
    }

    const interesting =
      url.includes('/api/auth/me') ||
      url.includes('/api/payment/wechat/config') ||
      url.includes('/api/wechat/jsapi-signature') ||
      url.includes('/api/payment/wechat/jsapi/recharge/create') ||
      url.includes('/api/payment/recharge/');

    if (!interesting) {
      return;
    }

    let body = null;
    try {
      body = await response.json();
    } catch {
      try {
        body = await response.text();
      } catch {
        body = null;
      }
    }

    report.httpEvents.push({
      url,
      status: response.status(),
      method: response.request().method(),
      body,
    });
  });

  await page.addInitScript((value) => {
    window.localStorage.setItem('auth_token', value);
  }, token);

  const authMeResponse = await page.request.get(`${baseUrl}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  report.authMe = await authMeResponse.json().catch(() => null);

  const paymentConfigResponse = await page.request.get(`${baseUrl}/api/payment/wechat/config`);
  report.paymentConfig = await paymentConfigResponse.json().catch(() => null);

  await page.goto(`${baseUrl}/payment/wechat/jsapi?rechargeAmount=${encodeURIComponent(rechargeAmount)}`, {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForTimeout(12000);

  report.final = {
    url: page.url(),
    title: await page.title(),
    bodyText: ((await page.locator('body').innerText()).slice(0, 2000)),
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
