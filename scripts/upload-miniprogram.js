#!/usr/bin/env node

/**
 * 微信小程序上传工具
 *
 * 用法：
 *   node scripts/upload-miniprogram.js
 *
 * 环境变量：
 *   MINIPROGRAM_PRIVATE_KEY_PATH - 私钥文件路径（可选）
 *   MINIPROGRAM_APPID - 小程序 AppID（可选，默认从 project.config.json 读取）
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const MINIPROGRAM_DIR = path.join(__dirname, '../miniprogram');
const PRIVATE_KEY_PATH = process.env.MINIPROGRAM_PRIVATE_KEY_PATH || path.join(MINIPROGRAM_DIR, 'private.key');
const PROJECT_CONFIG_PATH = path.join(MINIPROGRAM_DIR, 'project.config.json');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * 读取项目配置
 */
function readProjectConfig() {
  if (!fs.existsSync(PROJECT_CONFIG_PATH)) {
    error('找不到 project.config.json 文件');
    process.exit(1);
  }

  try {
    const config = JSON.parse(fs.readFileSync(PROJECT_CONFIG_PATH, 'utf8'));
    return {
      appid: config.appid,
      projectname: config.projectname,
    };
  } catch (e) {
    error('读取 project.config.json 失败');
    error(e.message);
    process.exit(1);
  }
}

/**
 * 检查私钥文件
 */
function checkPrivateKey() {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    error('找不到私钥文件');
    info(`私钥路径: ${PRIVATE_KEY_PATH}`);
    info('');
    info('请按以下步骤配置私钥：');
    info('1. 登录微信小程序后台：https://mp.weixin.qq.com/');
    info('2. 进入：开发 -> 开发管理 -> 开发设置');
    info('3. 找到"小程序代码上传"部分');
    info('4. 点击"生成"或"重置"私钥');
    info('5. 下载私钥文件并放置到：' + PRIVATE_KEY_PATH);
    info('6. 设置文件权限：chmod 600 ' + PRIVATE_KEY_PATH);
    info('');
    info('详细说明请参考：AUTO_UPLOAD_CONFIG.md');
    process.exit(1);
  }

  // 检查文件权限
  try {
    const stats = fs.statSync(PRIVATE_KEY_PATH);
    const mode = (stats.mode & parseInt('777', 8)).toString(8);
    if (mode !== '600') {
      warning(`私钥文件权限不安全（当前: ${mode}，建议: 600）`);
      info(`运行: chmod 600 ${PRIVATE_KEY_PATH}`);
    }
  } catch (e) {
    warning('无法检查私钥文件权限');
  }

  return PRIVATE_KEY_PATH;
}

/**
 * 执行上传命令
 */
function upload(version, description) {
  const { appid } = readProjectConfig();
  const privateKeyPath = checkPrivateKey();

  info('开始上传到微信小程序平台...');
  info(`AppID: ${appid}`);
  info(`版本: ${version}`);
  info(`描述: ${description}`);
  info('');

  const command = `/usr/bin/miniprogram-ci upload \
    --appid ${appid} \
    --project-path ${MINIPROGRAM_DIR} \
    --private-key-path ${privateKeyPath} \
    --upload-version ${version} \
    --upload-description "${description}" \
    --use-project-config`;

  log('执行命令:', 'blue');
  log(command, 'blue');
  log('', 'blue');

  exec(command, (error, stdout, stderr) => {
    if (error) {
      error('上传失败');
      error(error.message);
      if (stderr) {
        error(stderr);
      }
      process.exit(1);
    }

    if (stderr) {
      warning('警告信息：');
      log(stderr, 'yellow');
    }

    log(stdout, 'reset');
    success('上传成功！');
    success(`版本: ${version}`);
    success(`描述: ${description}`);
    info('');
    info('下一步：');
    info('1. 登录微信小程序后台：https://mp.weixin.qq.com/');
    info('2. 进入：版本管理');
    info('3. 找到版本 ' + version);
    info('4. 点击"提交审核"');
  });
}

/**
 * 主函数
 */
function main() {
  const version = process.argv[2] || getVersionFromChangelog();
  const description = process.argv.slice(3).join(' ') || getDescriptionFromChangelog();

  if (!version) {
    error('请提供版本号');
    info('用法: node scripts/upload-miniprogram.js <版本号> <描述>');
    info('示例: node scripts/upload-miniprogram.js 1.0.20260226.2137 "修复TabBar配置错误"');
    process.exit(1);
  }

  info('=' .repeat(60));
  info('微信小程序上传工具');
  info('=' .repeat(60));
  info('');
  upload(version, description);
}

/**
 * 从 CHANGELOG.md 读取最新版本
 */
function getVersionFromChangelog() {
  const changelogPath = path.join(__dirname, '../CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(changelogPath, 'utf8');
    const match = content.match(/## 版本 ([\d.]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

/**
 * 从 CHANGELOG.md 读取最新版本描述
 */
function getDescriptionFromChangelog() {
  const changelogPath = path.join(__dirname, '../CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(changelogPath, 'utf8');
    const lines = content.split('\n');
    let description = '';

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('### 🐛 Bug 修复') || lines[i].startsWith('### ✨ 新增功能')) {
        // 收集后续几行作为描述
        for (let j = i + 1; j < lines.length && j < i + 10; j++) {
          if (lines[j].startsWith('##')) {
            break;
          }
          if (lines[j].trim() && lines[j].startsWith('- ✅')) {
            description += lines[j].trim() + ' ';
          }
        }
        break;
      }
    }

    return description.trim().substring(0, 100); // 限制100字符
  } catch (e) {
    return null;
  }
}

// 运行
main();
