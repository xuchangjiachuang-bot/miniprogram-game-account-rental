#!/usr/bin/env node

/**
 * 微信小程序快速上传工具（简化版）
 *
 * 用法：
 *   node miniprogram/upload-quick.js [版本号] [描述]
 *
 * 示例：
 *   node miniprogram/upload-quick.js
 *   node miniprogram/upload-quick.js 1.0.20260226.2137 "修复TabBar配置错误"
 */

const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

// 获取参数
const version = process.argv[2];
const description = process.argv[3] || '游戏账号租赁平台小程序';

// 配置
const projectConfig = {
  appid: 'wx2382e1949d031ba6',
  type: 'miniProgram',
  projectPath: __dirname,
  privateKeyPath: process.env.MINIPROGRAM_PRIVATE_KEY_PATH || path.join(__dirname, 'private.key'),
  ignores: []
};

// 检查私钥文件
if (!fs.existsSync(projectConfig.privateKeyPath)) {
  console.error('❌ 私钥文件不存在');
  console.error('私钥路径:', projectConfig.privateKeyPath);
  console.error('');
  console.error('请按以下步骤配置私钥：');
  console.error('1. 登录微信小程序后台：https://mp.weixin.qq.com/');
  console.error('2. 进入：开发 -> 开发管理 -> 开发设置');
  console.error('3. 找到"小程序代码上传"部分');
  console.error('4. 点击"生成"或"重置"私钥');
  console.error('5. 下载私钥文件并重命名为：private.key');
  console.error('6. 放置到：' + projectConfig.privateKeyPath);
  console.error('7. 设置权限：chmod 600 ' + projectConfig.privateKeyPath);
  process.exit(1);
}

// 自动生成版本号
const autoVersion = () => {
  const now = new Date();
  return `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
};

const finalVersion = version || autoVersion();

console.log('='.repeat(50));
console.log('微信小程序快速上传');
console.log('='.repeat(50));
console.log('');
console.log('版本:', finalVersion);
console.log('描述:', description);
console.log('');

try {
  const project = new ci.Project(projectConfig);

  ci.upload({
    project,
    version: finalVersion,
    desc: description,
    setting: {
      es6: true,
      es7: true,
      minify: true,
      codeProtect: true,
      autoPrefixWXSS: true
    },
    robot: 30
  }).then(res => {
    console.log('='.repeat(50));
    console.log('✅ 上传成功！');
    console.log('='.repeat(50));
    console.log('版本号:', res.version);
    console.log('');
    console.log('下一步：');
    console.log('1. 登录 https://mp.weixin.qq.com/');
    console.log('2. 进入版本管理');
    console.log('3. 提交审核');
  }).catch(err => {
    console.error('❌ 上传失败:', err.message);
    console.error('');
    console.error('可能原因：');
    console.error('1. 私钥文件不正确');
    console.error('2. IP白名单未生效');
    console.error('3. 网络连接问题');
    process.exit(1);
  });
} catch (error) {
  console.error('❌ 错误:', error.message);
  process.exit(1);
}
