import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const envFiles = ['.env.production', '.env.local', '.env'];

function parseEnvFile(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

function loadEnvConfig() {
  for (const file of envFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      return {
        file,
        values: parseEnvFile(fs.readFileSync(fullPath, 'utf8')),
      };
    }
  }

  return {
    file: 'process.env',
    values: process.env,
  };
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function main() {
  const { file, values } = loadEnvConfig();
  const issues = [];
  const warnings = [];

  const requiredKeys = [
    'NEXT_PUBLIC_BASE_URL',
    'WECHAT_APPID',
    'WECHAT_MCH_ID',
    'WECHAT_API_KEY',
    'WECHAT_NOTIFY_URL',
    'WECHAT_MP_APPID',
    'WECHAT_MP_SECRET',
  ];

  for (const key of requiredKeys) {
    if (!values[key]) {
      issues.push(`缺少配置: ${key}`);
    }
  }

  if (values.WECHAT_API_KEY === 'your_api_key_here') {
    issues.push('WECHAT_API_KEY 仍然是占位值 your_api_key_here');
  }

  if (values.WECHAT_CERT_P12_PASSWORD === 'your_cert_password_here') {
    warnings.push('WECHAT_CERT_P12_PASSWORD 仍然是占位值');
  }

  if (values.NEXT_PUBLIC_BASE_URL && !isHttpsUrl(values.NEXT_PUBLIC_BASE_URL)) {
    warnings.push(`NEXT_PUBLIC_BASE_URL 不是 HTTPS: ${values.NEXT_PUBLIC_BASE_URL}`);
  }

  if (values.WECHAT_NOTIFY_URL && !isHttpsUrl(values.WECHAT_NOTIFY_URL)) {
    warnings.push(`WECHAT_NOTIFY_URL 不是 HTTPS: ${values.WECHAT_NOTIFY_URL}`);
  }

  if (values.NEXT_PUBLIC_BASE_URL && values.WECHAT_NOTIFY_URL) {
    try {
      const baseHost = new URL(values.NEXT_PUBLIC_BASE_URL).host;
      const notifyHost = new URL(values.WECHAT_NOTIFY_URL).host;
      if (baseHost !== notifyHost) {
        warnings.push(`站点域名与支付回调域名不一致: ${baseHost} != ${notifyHost}`);
      }
    } catch {
      warnings.push('NEXT_PUBLIC_BASE_URL 或 WECHAT_NOTIFY_URL 不是合法 URL');
    }
  }

  console.log(JSON.stringify({
    source: file,
    summary: {
      issueCount: issues.length,
      warningCount: warnings.length,
    },
    issues,
    warnings,
    snapshot: {
      NEXT_PUBLIC_BASE_URL: values.NEXT_PUBLIC_BASE_URL || null,
      WECHAT_NOTIFY_URL: values.WECHAT_NOTIFY_URL || null,
      WECHAT_APPID: values.WECHAT_APPID ? `${values.WECHAT_APPID.slice(0, 8)}***` : null,
      WECHAT_MCH_ID: values.WECHAT_MCH_ID ? `${values.WECHAT_MCH_ID.slice(0, 6)}***` : null,
      WECHAT_MP_APPID: values.WECHAT_MP_APPID ? `${values.WECHAT_MP_APPID.slice(0, 8)}***` : null,
    },
  }, null, 2));

  if (issues.length > 0) {
    process.exitCode = 1;
  }
}

main();
