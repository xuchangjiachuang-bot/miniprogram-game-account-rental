const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 创建私钥文件
const privateKeyContent = `CONFIGURE_LOCALLY`;

const privateKeyPath = path.join(__dirname, 'CONFIGURE_LOCALLY');
fs.writeFileSync(privateKeyPath, privateKeyContent);

// 方案1：使用GitHub Actions的固定IP
const githubActionsIPs = [
  '185.199.108.153',
  '185.199.109.153',
  '185.199.110.153',
  '185.199.111.153'
];

console.log('=== IP地址变动解决方案 ===\n');
console.log('方案1: 添加所有可能的IP段到白名单');
console.log('方案2: 使用第三方CI/CD平台（推荐）');
console.log('方案3: 使用微信开发者工具手动上传\n');

console.log('=== GitHub Actions 固定IP ===');
console.log('请将以下IP地址添加到白名单:');
githubActionsIPs.forEach(ip => console.log('  -', ip));
console.log('');

console.log('=== 方案对比 ===\n');

console.log('【方案1: 添加多个IP】');
console.log('  优点: 可以继续在当前环境上传');
console.log('  缺点: IP会频繁变化，需要频繁更新白名单');
console.log('  可行性: 低\n');

console.log('【方案2: 第三方CI/CD平台】（推荐）');
console.log('  - GitHub Actions: 固定出口IP');
console.log('  - CODING: 腾讯云出品，固定IP');
console.log('  - 阿里云云效: 固定IP');
console.log('  优点: IP固定，自动化上传');
console.log('  缺点: 需要配置CI/CD流程');
console.log('  可行性: 高\n');

console.log('【方案3: 微信开发者工具手动上传】（最简单）');
console.log('  优点: 无需处理IP问题，上传成功率高');
console.log('  缺点: 需要手动操作');
console.log('  可行性: 最高\n');

console.log('=== 推荐流程 ===\n');
console.log('1. 立即使用微信开发者工具手动上传（最快）');
console.log('2. 配置GitHub Actions实现自动化上传');
console.log('');

console.log('=== 创建GitHub Actions配置文件 ===');

// 创建GitHub Actions配置
const githubActionsConfig = `name: Upload WeChat Mini Program

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  upload:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install miniprogram-ci
    
    - name: Create private key
      run: |
        echo "$MINIPROGRAM_PRIVATE_KEY" > CONFIGURE_LOCALLY
    
    - name: Upload to WeChat
      run: node miniprogram/upload.js
      env:
        MINIPROGRAM_PRIVATE_KEY: \${{ secrets.MINIPROGRAM_PRIVATE_KEY }}
`;

fs.writeFileSync(
  path.join(__dirname, '../.github/workflows/upload-miniprogram.yml'),
  githubActionsConfig
);

console.log('✅ 已创建GitHub Actions配置文件');
console.log('   路径: .github/workflows/upload-miniprogram.yml\n');

console.log('=== 下一步操作 ===\n');
console.log('1. 立即方案 - 使用微信开发者工具:');
console.log('   a. 下载: https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html');
console.log('   b. 导入项目: /workspace/projects/miniprogram');
console.log('   c. AppID: twx2382e1949d031ba6');
console.log('   d. 点击"上传"按钮\n');

console.log('2. 长期方案 - 使用GitHub Actions:');
console.log('   a. 推送代码到GitHub仓库');
console.log('   b. 在GitHub仓库设置中添加Secret:');
console.log('      - Name: MINIPROGRAM_PRIVATE_KEY');
console.log('      - Value: (私钥文件内容)');
console.log('   c. 将以下IP添加到微信白名单:');
githubActionsIPs.forEach(ip => console.log('      - ' + ip));
console.log('   d. 触发GitHub Actions工作流\n');

if (fs.existsSync(privateKeyPath)) {
  fs.unlinkSync(privateKeyPath);
}

console.log('=== 总结 ===\n');
console.log('由于IP地址会动态变化，建议:');
console.log('1. 短期：使用微信开发者工具手动上传');
console.log('2. 长期：配置GitHub Actions实现自动化上传');
