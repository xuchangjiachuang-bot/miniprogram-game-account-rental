import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
const adminUsername = process.env.SMOKE_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'admin123';
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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
const ignoredConsoleErrorPatterns = [
  /加载账号失败: TypeError: Failed to fetch/,
];

function shouldIgnoreConsoleError(text) {
  return ignoredConsoleErrorPatterns.some((pattern) => pattern.test(text));
}

page.on('pageerror', (error) => {
  errors.push(`pageerror: ${error.message}`);
});
page.on('console', (message) => {
  if (message.type() === 'error') {
    const text = message.text();
    if (shouldIgnoreConsoleError(text)) {
      return;
    }
    errors.push(`console: ${text}`);
  }
});

async function visit(pathname) {
  const response = await page.goto(`${baseUrl}${pathname}`, {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForTimeout(1000);

  return {
    pathname,
    status: response?.status() ?? null,
    url: page.url(),
    title: await page.title(),
  };
}

async function safeClick(selector, label, waitMs = 1000) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) {
    errors.push(`missing:${label}`);
    return false;
  }

  try {
    await locator.click({ timeout: 5000 });
    await page.waitForTimeout(waitMs);
    results.push({
      pathname: `click:${label}`,
      status: null,
      url: page.url(),
      title: await page.title(),
    });
    return true;
  } catch (error) {
    errors.push(`click:${label}:${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function safeFill(selector, value, label, waitMs = 800) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) {
    errors.push(`missing:${label}`);
    return false;
  }

  try {
    await locator.fill(value);
    await page.waitForTimeout(waitMs);
    results.push({
      pathname: `fill:${label}`,
      status: null,
      url: page.url(),
      title: await page.title(),
    });
    return true;
  } catch (error) {
    errors.push(`fill:${label}:${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

const results = [];

results.push(await visit('/'));
results.push(await visit('/orders'));
results.push(await visit('/seller/accounts'));
results.push(await visit('/seller/accounts/new'));

const homepageLinks = await page.locator('a[href]').evaluateAll((nodes) =>
  nodes.slice(0, 12).map((node) => ({
    href: node.getAttribute('href'),
    text: (node.textContent || '').trim(),
  }))
);

const aboutLink = page.locator('a[href="/about"]').first();
if (await aboutLink.count()) {
  await aboutLink.click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  results.push({
    pathname: 'click:/about',
    status: null,
    url: page.url(),
    title: await page.title(),
  });
}

results.push(await visit('/login'));
results.push(await visit('/admin/login'));

await page.fill('#username', adminUsername);
await page.fill('#password', adminPassword);

const loginResponsePromise = page.waitForResponse(
  (response) =>
    response.url().includes('/api/admin/auth/login') &&
    response.request().method() === 'POST'
);

await page.locator('button[type="submit"]').click();
const loginResponse = await loginResponsePromise;
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1000);

results.push({
  pathname: 'api:/api/admin/auth/login',
  status: loginResponse.status(),
  url: page.url(),
  title: await page.title(),
});

results.push(await visit('/admin'));
await safeClick('a[href="/admin/accounts"]', '/admin->accounts');
results.push(await visit('/admin'));
await safeClick('button:has-text("立即检查")', 'admin:check-expired', 1500);

for (const route of adminRoutes.slice(1)) {
  results.push(await visit(route));
}

await visit('/admin/users');
await safeClick('button:has-text("刷新")', 'admin-users:refresh', 1200);
await safeFill('input[placeholder*="手机"]', '13', 'admin-users:search', 1200);

await visit('/admin/withdrawals');
await safeClick('button:has-text("刷新")', 'admin-withdrawals:refresh', 1200);

await visit('/admin/wechat/verify-file');
await safeClick('button:has-text("刷新状态")', 'admin-wechat-verify:refresh', 1200);

await visit('/admin/orders');
await safeFill('input[placeholder*="订单号"]', 'ORD', 'admin-orders:search', 1200);
await safeClick('button:has-text("查看")', 'admin-orders:view', 1200);
await safeClick('button:has-text("关闭")', 'admin-orders:close-detail', 800);

await visit('/admin/verification-requests');
await safeClick('button:has-text("审核")', 'admin-verification:open', 1200);
await safeClick('button:has-text("取消")', 'admin-verification:close', 800);

const authMeResponse = await page.request.get(`${baseUrl}/api/admin/auth/me`, {
  headers: {
    cookie: (await page.context().cookies())
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; '),
  },
});

const cookieHeader = (await page.context().cookies())
  .map((cookie) => `${cookie.name}=${cookie.value}`)
  .join('; ');

const usersResponse = await page.request.get(`${baseUrl}/api/admin/users?page=1&pageSize=20`, {
  headers: {
    cookie: cookieHeader,
  },
});
const usersPayload = await usersResponse.json().catch(() => null);

await visit('/admin');
const dashboardAccountsLink = page.locator('a[href="/admin/accounts"]').first();
if (await dashboardAccountsLink.count()) {
  try {
    await dashboardAccountsLink.click({ timeout: 5000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    results.push({
      pathname: 'click:/admin/accounts',
      status: null,
      url: page.url(),
      title: await page.title(),
    });
  } catch (error) {
    errors.push(`optional-click: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(
  JSON.stringify(
    {
      baseUrl,
      homepageLinks,
      results,
      authMeStatus: authMeResponse.status(),
      usersApiStatus: usersResponse.status(),
      usersApiSuccess: usersPayload?.success ?? null,
      usersApiTotal: usersPayload?.total ?? null,
      finalUrl: page.url(),
      errors,
    },
    null,
    2
  )
);

await browser.close();
