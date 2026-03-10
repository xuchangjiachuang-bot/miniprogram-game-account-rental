import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
const adminUsername = process.env.SMOKE_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'admin123';

const ignoredConsoleErrorPatterns = [
  /加载账号失败: TypeError: Failed to fetch/,
];

function shouldIgnoreConsoleError(text) {
  if (text.includes('鍔犺浇璁㈠崟澶辫触: TypeError: Failed to fetch')) {
    return true;
  }
  return ignoredConsoleErrorPatterns.some((pattern) => pattern.test(text));
}

function getTokenStoragePath() {
  return path.join(process.env.SystemDrive || 'C:', 'tmp', 'auth_tokens.json');
}

function getFrontendAuth() {
  const tokenFile = getTokenStoragePath();
  const raw = fs.readFileSync(tokenFile, 'utf8');
  const payload = JSON.parse(raw);
  const entries = Object.entries(payload);
  const match = entries.find(([, value]) => value?.user?.phone);

  if (!match) {
    throw new Error(`No frontend auth token with phone found in ${tokenFile}`);
  }

  const [token, tokenData] = match;
  return {
    token,
    user: tokenData.user,
  };
}

function createCollector(page, scope, errors) {
  page.on('pageerror', (error) => {
    errors.push(`${scope}:pageerror:${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return;
    }

    const text = message.text();
    if (shouldIgnoreConsoleError(text)) {
      return;
    }

    errors.push(`${scope}:console:${text}`);
  });

  page.on('response', async (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    if (!['fetch', 'xhr', 'document'].includes(resourceType)) {
      return;
    }

    const status = response.status();
    if (status < 400) {
      return;
    }

    const url = response.url();
    if (url.includes('/api/auth/wechat/config') && status < 500) {
      return;
    }

    errors.push(`${scope}:http:${status}:${resourceType}:${url}`);
  });
}

async function visit(page, pathname, bucket, waitUntil = 'domcontentloaded') {
  const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil });
  await page.waitForTimeout(1000);
  bucket.push({
    kind: 'page',
    pathname,
    status: response?.status() ?? null,
    url: page.url(),
    title: await page.title(),
  });
}

async function safeClick(page, selector, label, bucket, errors, waitMs = 1000) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) {
    errors.push(`missing:${label}`);
    return false;
  }

  try {
    await locator.click({ timeout: 5000 });
    await page.waitForTimeout(waitMs);
    bucket.push({
      kind: 'click',
      label,
      url: page.url(),
      title: await page.title(),
    });
    return true;
  } catch (error) {
    errors.push(`click:${label}:${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function safeFill(page, selector, value, label, bucket, errors, waitMs = 700) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) {
    errors.push(`missing:${label}`);
    return false;
  }

  try {
    await locator.fill(value);
    await page.waitForTimeout(waitMs);
    bucket.push({
      kind: 'fill',
      label,
      value,
      url: page.url(),
      title: await page.title(),
    });
    return true;
  } catch (error) {
    errors.push(`fill:${label}:${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function checkJson(request, label, url, options, bucket, errors) {
  try {
    const response = await request.fetch(url, options);
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    bucket.push({
      kind: 'api',
      label,
      status: response.status(),
      ok: response.ok(),
      body,
    });

    if (!response.ok()) {
      errors.push(`api:${label}:${response.status()}`);
    }
  } catch (error) {
    errors.push(`api:${label}:${error instanceof Error ? error.message : String(error)}`);
  }
}

const browser = await chromium.launch({ headless: true });
const report = {
  baseUrl,
  public: { results: [], errors: [] },
  frontendAuth: { user: null, results: [], errors: [] },
  admin: { results: [], errors: [] },
};

try {
  const publicPage = await browser.newPage();
  createCollector(publicPage, 'public', report.public.errors);

  const publicRoutes = [
    '/',
    '/about',
    '/terms',
    '/privacy',
    '/disclaimer',
    '/login',
    '/orders',
    '/seller/accounts',
    '/seller/accounts/new',
  ];

  for (const route of publicRoutes) {
    await visit(publicPage, route, report.public.results);
  }

  await checkJson(
    publicPage.request,
    'homepage-config',
    `${baseUrl}/api/homepage-config`,
    {},
    report.public.results,
    report.public.errors
  );
  await checkJson(
    publicPage.request,
    'accounts-list',
    `${baseUrl}/api/accounts?auditStatus=approved&status=available&limit=100`,
    {},
    report.public.results,
    report.public.errors
  );
  await checkJson(
    publicPage.request,
    'customer-service-config',
    `${baseUrl}/api/customer-service/config`,
    {},
    report.public.results,
    report.public.errors
  );
  await checkJson(
    publicPage.request,
    'wechat-config-local',
    `${baseUrl}/api/auth/wechat/config`,
    {},
    report.public.results,
    report.public.errors
  );

  const frontendAuth = getFrontendAuth();
  report.frontendAuth.user = {
    id: frontendAuth.user.id,
    phone: frontendAuth.user.phone,
    username: frontendAuth.user.username,
  };

  const frontendContext = await browser.newContext();
  await frontendContext.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('auth_token', token);
      window.localStorage.setItem('cached_user', JSON.stringify(user));
      window.localStorage.setItem('user_cache_time', Date.now().toString());
    },
    { token: frontendAuth.token, user: frontendAuth.user }
  );

  const frontendPage = await frontendContext.newPage();
  createCollector(frontendPage, 'frontend-auth', report.frontendAuth.errors);

  const frontendRoutes = [
    '/user-center',
    '/user-center?tab=profile',
    '/user-center?tab=verification',
    '/user-center?tab=chats',
    '/user-center?tab=orders',
    '/user-center?tab=wallet',
    '/user-center?tab=notifications',
    '/wallet',
    '/orders',
    '/seller/accounts',
    '/seller/accounts/new',
  ];

  for (const route of frontendRoutes) {
    await visit(frontendPage, route, report.frontendAuth.results);
  }

  await visit(frontendPage, '/wallet', report.frontendAuth.results);
  await safeClick(frontendPage, 'button:has-text("刷新")', 'wallet:refresh', report.frontendAuth.results, report.frontendAuth.errors, 1200);
  await safeClick(frontendPage, 'button:has-text("充值")', 'wallet:tab-recharge', report.frontendAuth.results, report.frontendAuth.errors, 800);
  await safeClick(frontendPage, 'button:has-text("交易记录")', 'wallet:tab-transactions', report.frontendAuth.results, report.frontendAuth.errors, 800);

  await visit(frontendPage, '/seller/accounts', report.frontendAuth.results);
  await safeFill(frontendPage, 'input[placeholder*="搜索"]', 'wegame', 'seller-accounts:search', report.frontendAuth.results, report.frontendAuth.errors, 1000);

  const frontendHeaders = {
    Authorization: `Bearer ${frontendAuth.token}`,
    'Content-Type': 'application/json',
  };

  await checkJson(
    frontendPage.request,
    'auth-me',
    `${baseUrl}/api/auth`,
    { headers: frontendHeaders },
    report.frontendAuth.results,
    report.frontendAuth.errors
  );
  await checkJson(
    frontendPage.request,
    'orders-by-user',
    `${baseUrl}/api/orders?user_id=${encodeURIComponent(frontendAuth.user.id)}`,
    { headers: frontendHeaders },
    report.frontendAuth.results,
    report.frontendAuth.errors
  );
  await checkJson(
    frontendPage.request,
    'notifications-list',
    `${baseUrl}/api/notifications/list?limit=50`,
    { headers: frontendHeaders },
    report.frontendAuth.results,
    report.frontendAuth.errors
  );
  await checkJson(
    frontendPage.request,
    'chat-user-groups',
    `${baseUrl}/api/chat/user-groups`,
    { headers: frontendHeaders },
    report.frontendAuth.results,
    report.frontendAuth.errors
  );
  await checkJson(
    frontendPage.request,
    'balance',
    `${baseUrl}/api/balance?user_id=${encodeURIComponent(frontendAuth.user.id)}`,
    {},
    report.frontendAuth.results,
    report.frontendAuth.errors
  );

  const adminPage = await browser.newPage();
  createCollector(adminPage, 'admin', report.admin.errors);

  await visit(adminPage, '/admin/login', report.admin.results);
  await adminPage.fill('#username', adminUsername);
  await adminPage.fill('#password', adminPassword);

  const loginResponsePromise = adminPage.waitForResponse(
    (response) =>
      response.url().includes('/api/admin/auth/login') &&
      response.request().method() === 'POST'
  );
  await adminPage.locator('button[type="submit"]').click();
  const adminLoginResponse = await loginResponsePromise;
  await adminPage.waitForLoadState('domcontentloaded');
  await adminPage.waitForTimeout(1000);
  report.admin.results.push({
    kind: 'api',
    label: 'admin-login',
    status: adminLoginResponse.status(),
    ok: adminLoginResponse.ok(),
  });

  const adminRoutes = [
    '/admin',
    '/admin/accounts',
    '/admin/chat-logs',
    '/admin/commission-activities',
    '/admin/homepage',
    '/admin/orders',
    '/admin/payments',
    '/admin/refunds',
    '/admin/settings',
    '/admin/skins',
    '/admin/sms',
    '/admin/users',
    '/admin/verification-requests',
    '/admin/wechat/verify-file',
    '/admin/wecom-customer-service',
    '/admin/withdrawals',
  ];

  for (const route of adminRoutes) {
    await visit(adminPage, route, report.admin.results);
  }

  await visit(adminPage, '/admin/users', report.admin.results);
  await safeClick(adminPage, 'button:has-text("刷新")', 'admin-users:refresh', report.admin.results, report.admin.errors, 1200);
  await safeFill(adminPage, 'input[placeholder*="手机"]', '158', 'admin-users:search', report.admin.results, report.admin.errors, 1000);

  await visit(adminPage, '/admin/orders', report.admin.results);
  await safeFill(adminPage, 'input[placeholder*="订单号"]', 'ORD', 'admin-orders:search', report.admin.results, report.admin.errors, 1000);
  await safeClick(adminPage, 'button:has-text("查看")', 'admin-orders:view', report.admin.results, report.admin.errors, 1000);
  await safeClick(adminPage, 'button:has-text("关闭")', 'admin-orders:close', report.admin.results, report.admin.errors, 800);

  await visit(adminPage, '/admin/verification-requests', report.admin.results);
  await safeClick(adminPage, 'button:has-text("审核")', 'admin-verification:open', report.admin.results, report.admin.errors, 1000);
  await safeClick(adminPage, 'button:has-text("取消")', 'admin-verification:close', report.admin.results, report.admin.errors, 800);

  await visit(adminPage, '/admin/withdrawals', report.admin.results);
  await safeClick(adminPage, 'button:has-text("刷新")', 'admin-withdrawals:refresh', report.admin.results, report.admin.errors, 1200);

  await visit(adminPage, '/admin/wechat/verify-file', report.admin.results);
  await safeClick(adminPage, 'button:has-text("刷新状态")', 'admin-wechat:refresh', report.admin.results, report.admin.errors, 1200);

  const adminCookieHeader = (await adminPage.context().cookies())
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  await checkJson(
    adminPage.request,
    'admin-auth-me',
    `${baseUrl}/api/admin/auth/me`,
    { headers: { cookie: adminCookieHeader } },
    report.admin.results,
    report.admin.errors
  );
  await checkJson(
    adminPage.request,
    'admin-users',
    `${baseUrl}/api/admin/users?page=1&pageSize=20`,
    { headers: { cookie: adminCookieHeader } },
    report.admin.results,
    report.admin.errors
  );
  await checkJson(
    adminPage.request,
    'admin-orders',
    `${baseUrl}/api/admin/orders`,
    { headers: { cookie: adminCookieHeader } },
    report.admin.results,
    report.admin.errors
  );
  await checkJson(
    adminPage.request,
    'admin-withdrawals',
    `${baseUrl}/api/admin/withdrawals`,
    { headers: { cookie: adminCookieHeader } },
    report.admin.results,
    report.admin.errors
  );

  console.log(JSON.stringify(report, null, 2));

  await frontendContext.close();
  await publicPage.close();
  await adminPage.close();
} finally {
  await browser.close();
}
