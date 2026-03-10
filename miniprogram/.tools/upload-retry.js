/**
 * 小程序上传重试脚本
 * 自动重试最多3次
 */

const ci = require('miniprogram-ci');
const path = require('path');

// 配置信息
const projectPath = path.join(__dirname, '..');
const project = new ci.Project({
  appid: 'wx2382e1949d031ba6',
  type: 'miniProgram',
  projectPath: projectPath,
  privateKeyPath: path.join(__dirname, '..', 'private.key'),
  ignores: ['node_modules/**/*']
});

// 上传配置
const uploadConfig = {
  version: '1.0.20260227.2006',
  desc: '修复UI问题，实装微信授权登录',
  setting: {
    es6: true,
    es7: true,
    minify: true,
    codeProtect: true,
    autoPrefixWXSS: true
  },
  onProgressUpdate: console.log
};

// 重试上传
async function uploadWithRetry(maxRetries = 3) {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    retryCount++;

    console.log('='.repeat(80));
    console.log(`🚀 开始上传小程序 (尝试 ${retryCount}/${maxRetries})`);
    console.log('='.repeat(80));
    console.log(`版本号: ${uploadConfig.version}`);
    console.log(`描述: ${uploadConfig.desc}`);
    console.log(`时间: ${new Date().toLocaleString()}`);
    console.log();

    try {
      await ci.upload({
        project,
        version: uploadConfig.version,
        desc: uploadConfig.desc,
        setting: uploadConfig.setting,
        robot: 30
      });
      console.log();
      console.log('='.repeat(80));
      console.log('✅ 上传成功！');
      console.log('='.repeat(80));
      console.log();
      console.log('📦 版本信息:');
      console.log(`  版本号: ${uploadConfig.version}`);
      console.log(`  描述: ${uploadConfig.desc}`);
      console.log();
      console.log('📱 下一步操作:');
      console.log('  1. 登录微信公众平台: https://mp.weixin.qq.com/');
      console.log('  2. 进入"版本管理" → "开发版本"');
      console.log('  3. 找到刚才上传的版本');
      console.log('  4. 点击"提交审核"或"体验版"');
      console.log();

      process.exit(0);
    } catch (error) {
      console.log();
      console.log('❌ 上传失败');
      console.log(`错误信息: ${error.message}`);
      console.log(`错误代码: ${error.errcode}`);
      console.log();

      if (retryCount < maxRetries) {
        console.log(`⏳ 等待5秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // 所有重试都失败
  console.log();
  console.log('='.repeat(80));
  console.log('⚠️  所有重试均失败');
  console.log('='.repeat(80));
  console.log();
  console.log('可能的原因:');
  console.log('1. 白名单刚配置，还未生效（需要等待10-15分钟）');
  console.log('2. 配置位置错误（应该在"服务器IP白名单"，而非"服务器域名"）');
  console.log('3. 网络连接不稳定');
  console.log();
  console.log('建议操作:');
  console.log('1. 等待15分钟后重试');
  console.log('2. 检查微信后台配置位置是否正确');
  console.log('3. 使用微信开发者工具手动上传（最稳定）');
  console.log();
  console.log('微信开发者工具上传步骤:');
  console.log('  1. 下载微信开发者工具');
  console.log('  2. 打开项目文件夹: /workspace/projects/miniprogram');
  console.log('  3. 点击"上传"按钮');
  console.log('  4. 无需配置IP白名单');
  console.log();

  process.exit(1);
}

uploadWithRetry();
