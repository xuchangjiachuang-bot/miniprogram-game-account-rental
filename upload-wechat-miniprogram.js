#!/usr/bin/env node

/**
 * 微信小程序上传工具 - 永久版
 *
 * 用法：
 *   node upload-wechat-miniprogram.js [版本号] [描述]
 *
 * 环境变量：
 *   MINIPROGRAM_PRIVATE_KEY_PATH - 私钥文件路径（默认：miniprogram/private.key）
 *
 * 示例：
 *   node upload-wechat-miniprogram.js
 *   node upload-wechat-miniprogram.js 1.0.20260226.2152 "修复TabBar配置错误"
 */

const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

// 配置
const CONFIG = {
  appid: 'wx2382e1949d031ba6',
  type: 'miniProgram',
  projectPath: path.join(__dirname, 'miniprogram'),
  privateKeyPath: process.env.MINIPROGRAM_PRIVATE_KEY_PATH || path.join(__dirname, 'miniprogram', 'private.key'),
  ignores: [
    'node_modules/**',
    '.git/**',
    '*.md',
    'upload-*.js',
    'diagnose*.js',
    'check-*.js',
    'solve-*.js',
    'ip-*.js',
    'multi-*.js'
  ]
};

// 获取版本号
function getVersion() {
  const argVersion = process.argv[2];
  if (argVersion) {
    return argVersion;
  }

  // 自动生成版本号
  const now = new Date();
  return `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
}

// 获取描述
function getDescription() {
  const argDesc = process.argv.slice(3).join(' ');
  if (argDesc) {
    return argDesc;
  }

  // 尝试从 CHANGELOG.md 读取最新版本描述
  const changelogPath = path.join(__dirname, 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    const content = fs.readFileSync(changelogPath, 'utf8');
    const versionMatch = content.match(/## 版本 ([\d.]+)/);
    if (versionMatch) {
      const version = versionMatch[1];
      const versionSection = content.split(`## 版本 ${version}`)[1]?.split('##')[0] || '';
      const descMatch = versionSection.match(/-.*修复(.*?)(\n|$)/);
      if (descMatch) {
        return descMatch[1].trim() || '版本更新';
      }
    }
  }

  return '游戏账号租赁平台小程序';
}

// 验证私钥文件
function validatePrivateKey() {
  if (!fs.existsSync(CONFIG.privateKeyPath)) {
    console.error('❌ 私钥文件不存在');
    console.error('');
    console.error('私钥路径:', CONFIG.privateKeyPath);
    console.error('');
    console.error('请按以下步骤配置私钥：');
    console.error('');
    console.error('1. 登录微信小程序后台：https://mp.weixin.qq.com/');
    console.error('2. 进入：开发 -> 开发管理 -> 开发设置');
    console.error('3. 找到"小程序代码上传"部分');
    console.error('4. 点击"生成"或"重置"私钥');
    console.error('5. 下载私钥文件并重命名为：private.key');
    console.error('6. 放置到：' + CONFIG.privateKeyPath);
    console.error('7. 设置权限（Linux/Mac）：chmod 600 ' + CONFIG.privateKeyPath);
    console.error('');
    console.error('或者设置环境变量：');
    console.error('export MINIPROGRAM_PRIVATE_KEY_PATH=/path/to/private.key');
    console.error('');
    console.error('详细说明请查看：UPLOAD_WECHAT_GUIDE.md');
    process.exit(1);
  }

  // 检查文件权限
  try {
    const stats = fs.statSync(CONFIG.privateKeyPath);
    const mode = (stats.mode & parseInt('777', 8)).toString(8);
    if (mode !== '600') {
      console.warn('⚠️  私钥文件权限不安全（当前: ' + mode + '，建议: 600）');
      console.warn('运行: chmod 600 ' + CONFIG.privateKeyPath);
      console.warn('');
    }
  } catch (e) {
    console.warn('⚠️  无法检查私钥文件权限');
    console.warn('');
  }
}

// 验证项目路径
function validateProjectPath() {
  if (!fs.existsSync(CONFIG.projectPath)) {
    console.error('❌ 项目路径不存在:', CONFIG.projectPath);
    process.exit(1);
  }
}

// 上传
async function upload() {
  console.log('='.repeat(80));
  console.log('🚀 微信小程序上传工具 - 永久版');
  console.log('='.repeat(80));
  console.log('');

  // 获取版本和描述
  const version = getVersion();
  const description = getDescription();

  // 验证配置
  validatePrivateKey();
  validateProjectPath();

  console.log('项目信息:');
  console.log('  AppID:', CONFIG.appid);
  console.log('  项目路径:', CONFIG.projectPath);
  console.log('  私钥文件:', CONFIG.privateKeyPath);
  console.log('');
  console.log('上传信息:');
  console.log('  版本号:', version);
  console.log('  描述:', description);
  console.log('  Robot:', 30);
  console.log('');
  console.log('开始上传...');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 创建项目
    const project = new ci.Project(CONFIG);

    // 上传
    await ci.upload({
      project,
      version: version,
      desc: description,
      setting: {
        es6: true,
        es7: true,
        minify: true,
        codeProtect: false,
        autoPrefixWXSS: true
      },
      onProgressUpdate: (res) => {
        if (res.progress) {
          console.log('上传进度:', res.progress + '%');
        }
      },
      robot: 30
    });

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ 上传成功！');
    console.log('='.repeat(80));
    console.log('版本号:', version);
    console.log('描述:', description);
    console.log('上传时间:', new Date().toLocaleString('zh-CN'));
    console.log('AppID:', CONFIG.appid);
    console.log('='.repeat(80));
    console.log('');
    console.log('下一步操作:');
    console.log('  1. 登录微信公众平台: https://mp.weixin.qq.com');
    console.log('  2. 进入: 管理 -> 版本管理');
    console.log('  3. 查看上传的版本');
    console.log('  4. 点击"提交审核"');
    console.log('  5. 填写审核信息并提交');
    console.log('');

  } catch (err) {
    console.log('');
    console.log('='.repeat(80));
    console.log('❌ 上传失败！');
    console.log('='.repeat(80));
    console.error('错误信息:', err.message);
    if (err.code) {
      console.error('错误代码:', err.code);
    }
    console.error('');
    console.error('可能的原因:');
    console.error('  1. IP白名单还没有生效（可能需要等待5-10分钟）');
    console.error('  2. 私钥文件格式不正确');
    console.error('  3. 网络连接问题');
    console.error('  4. 微信服务器暂时不可用');
    console.error('');
    console.error('建议操作:');
    console.error('  1. 确认IP白名单已正确添加');
    console.error('  2. 等待5-10分钟后重试');
    console.error('  3. 检查私钥文件是否正确');
    console.error('  4. 联系微信技术支持');
    console.error('');
    console.error('详细说明请查看：UPLOAD_WECHAT_GUIDE.md');
    console.error('='.repeat(80));
    process.exit(1);
  }
}

// 执行上传
upload();
