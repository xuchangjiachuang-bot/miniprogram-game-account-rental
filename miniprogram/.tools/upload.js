#!/usr/bin/env node
const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

// 创建私钥文件
const privateKeyContent = `CONFIGURE_LOCALLY`;

const projectRoot = path.join(__dirname, '..');
const privateKeyPath = path.join(projectRoot, 'CONFIGURE_LOCALLY');
fs.writeFileSync(privateKeyPath, privateKeyContent);

const projectConfig = {
  appid: 'wx2382e1949d031ba6',
  type: 'miniProgram',
  projectPath: projectRoot,
  privateKeyPath: privateKeyPath,
  ignores: []
};

const project = new ci.Project(projectConfig);
const now = new Date();
const version = `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

console.log('开始上传小程序...');
console.log('版本:', version);
console.log('AppID:', 'wx2382e1949d031ba6');
console.log('项目路径:', projectRoot);

// 使用robot=1尝试
ci.upload({
  project,
  version: version,
  desc: `游戏账号租赁平台小程序 v${version}`,
  setting: {
    es6: true,
    minify: true
  },
  onProgressUpdate: (res) => {
    console.log('进度:', res.message || res);
  },
  robot: 1
}).then(res => {
  console.log('\n✅ 上传成功！');
  console.log('版本:', version);
  console.log('时间:', new Date().toLocaleString('zh-CN'));
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
    console.log('私钥文件已清理');
  }
  process.exit(0);
}).catch(err => {
  console.log('\n❌ 上传失败:', err.message);
  console.log('错误代码:', err.code);
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
  }
  process.exit(1);
});
