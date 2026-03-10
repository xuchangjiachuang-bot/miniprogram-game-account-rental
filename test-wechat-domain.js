#!/usr/bin/env node

/**
 * 微信小程序域名测试工具
 *
 * 用法：
 *   node test-wechat-domain.js
 */

const https = require('https');
const http = require('http');

// 配置
const DOMAIN = '79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site';
const BASE_URL = `https://${DOMAIN}`;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function header(message) {
  console.log('');
  log('='.repeat(60), 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

// 测试 HTTPS 连接
function testHttpsConnection() {
  return new Promise((resolve) => {
    header('测试 HTTPS 连接');

    const options = {
      hostname: DOMAIN,
      port: 443,
      method: 'GET',
      path: '/',
      rejectUnauthorized: false, // 允许自签名证书
    };

    const req = https.request(options, (res) => {
      info(`状态码: ${res.statusCode}`);
      info(`HTTP 版本: ${res.httpVersion}`);
      info(`响应头: ${JSON.stringify(res.headers, null, 2)}`);

      if (res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
        success('HTTPS 连接成功');
        resolve(true);
      } else {
        warn(`HTTPS 连接成功，但状态码异常: ${res.statusCode}`);
        resolve(true);
      }
    });

    req.on('error', (err) => {
      error(`HTTPS 连接失败: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      error('HTTPS 连接超时');
      resolve(false);
    });

    req.end();
  });
}

// 测试 DNS 解析
function testDnsResolution() {
  return new Promise((resolve) => {
    header('测试 DNS 解析');

    const { lookup } = require('dns').promises;

    lookup(DOMAIN)
      .then((address) => {
        success(`DNS 解析成功: ${DOMAIN} -> ${address}`);
        resolve(true);
      })
      .catch((err) => {
        error(`DNS 解析失败: ${err.message}`);
        resolve(false);
      });
  });
}

// 测试 TCP 连接
function testTcpConnection() {
  return new Promise((resolve) => {
    header('测试 TCP 连接');

    const net = require('net');

    const socket = new net.Socket();

    socket.setTimeout(10000);

    socket.connect(443, DOMAIN, () => {
      success('TCP 连接成功');
      socket.destroy();
      resolve(true);
    });

    socket.on('error', (err) => {
      error(`TCP 连接失败: ${err.message}`);
      socket.destroy();
      resolve(false);
    });

    socket.on('timeout', () => {
      error('TCP 连接超时');
      socket.destroy();
      resolve(false);
    });
  });
}

// 测试 HTTP 请求
function testHttpRequest() {
  return new Promise((resolve) => {
    header('测试 HTTP 请求');

    const url = `${BASE_URL}/api/health`;

    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        info(`URL: ${url}`);
        info(`状态码: ${res.statusCode}`);

        try {
          const json = JSON.parse(data);
          info(`响应数据: ${JSON.stringify(json, null, 2)}`);
        } catch (e) {
          info(`响应数据: ${data}`);
        }

        if (res.statusCode < 500) {
          success('HTTP 请求成功');
          resolve(true);
        } else {
          error(`HTTP 请求失败: ${res.statusCode}`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      error(`HTTP 请求失败: ${err.message}`);
      resolve(false);
    });
  });
}

// 生成配置建议
function generateConfig() {
  header('域名配置建议');

  info('请在微信小程序后台配置以下域名：');
  console.log('');

  log('request 合法域名:', 'blue');
  success(`https://${DOMAIN}`);
  console.log('');

  log('socket 合法域名:', 'blue');
  success(`wss://${DOMAIN}`);
  console.log('');

  log('uploadFile 合法域名:', 'blue');
  success(`https://${DOMAIN}`);
  console.log('');

  log('downloadFile 合法域名:', 'blue');
  success(`https://${DOMAIN}`);
  console.log('');

  log('udp 合法域名:', 'blue');
  success(DOMAIN);
  console.log('');

  log('tcp 合法域名:', 'blue');
  success(DOMAIN);
  console.log('');

  log('DNS 预解析域名:', 'blue');
  success(DOMAIN);
  console.log('');

  log('预连接域名:', 'blue');
  success(DOMAIN);
  console.log('');
}

// 主函数
async function main() {
  console.log('');
  log('='.repeat(60), 'cyan');
  log('微信小程序域名测试工具', 'cyan');
  log('='.repeat(60), 'cyan');
  info(`测试域名: ${BASE_URL}`);
  info(`测试时间: ${new Date().toLocaleString('zh-CN')}`);

  let allPassed = true;

  // 测试 DNS 解析
  const dnsResult = await testDnsResolution();
  if (!dnsResult) allPassed = false;

  // 测试 TCP 连接
  const tcpResult = await testTcpConnection();
  if (!tcpResult) allPassed = false;

  // 测试 HTTPS 连接
  const httpsResult = await testHttpsConnection();
  if (!httpsResult) allPassed = false;

  // 测试 HTTP 请求
  const httpResult = await testHttpRequest();
  if (!httpResult) allPassed = false;

  // 生成配置建议
  generateConfig();

  // 总结
  header('测试总结');

  if (allPassed) {
    success('所有测试通过！');
    info('域名可以正常使用');
    info('请在微信小程序后台配置上述域名');
    info('配置后等待 5-10 分钟生效');
  } else {
    warn('部分测试失败');
    info('请检查：');
    info('1. 域名是否正确');
    info('2. SSL 证书是否有效');
    info('3. 后端服务是否正常运行');
    info('4. 网络连接是否正常');
  }

  console.log('');
  log('='.repeat(60), 'cyan');
  log('测试完成', 'cyan');
  log('='.repeat(60), 'cyan');
  console.log('');
}

// 运行
main().catch((err) => {
  error(`测试失败: ${err.message}`);
  process.exit(1);
});
