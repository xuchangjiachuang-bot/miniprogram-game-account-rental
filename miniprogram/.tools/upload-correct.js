const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

const privateKeyContent = `CONFIGURE_LOCALLY`;

console.log('='.repeat(80));
console.log('🚀 使用正确的AppID上传小程序');
console.log('='.repeat(80));
console.log();
console.log('AppID: wx2382e1949d031ba6');
console.log();

const privateKeyPath = path.join(__dirname, 'CONFIGURE_LOCALLY');
fs.writeFileSync(privateKeyPath, privateKeyContent);

async function upload() {
  const project = new ci.Project({
    appid: 'wx2382e1949d031ba6', // 正确的AppID
    type: 'miniProgram',
    projectPath: __dirname,
    privateKeyPath: privateKeyPath,
    ignores: []
  });
  
  const now = new Date();
  const version = `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  
  try {
    console.log('正在上传...');
    await ci.upload({
      project,
      version: version,
      desc: '游戏账号租赁平台小程序',
      setting: {
        es6: true,
        minify: true
      },
      robot: 30
    });
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ 上传成功！');
    console.log('='.repeat(80));
    console.log('版本:', version);
    console.log('时间:', new Date().toLocaleString('zh-CN'));
    console.log('AppID:', 'wx2382e1949d031ba6');
    console.log('='.repeat(80));
    
  } catch (err) {
    console.log();
    console.log('='.repeat(80));
    console.log('❌ 上传失败');
    console.log('='.repeat(80));
    console.log('错误:', err.message);
    console.log('错误代码:', err.code);
    console.log();
    
    if (err.message.includes('empty content')) {
      console.log('原因: IP白名单问题');
      console.log();
      console.log('建议:');
      console.log('1. 确认IP白名单已配置在"request合法域名"中');
      console.log('2. 等待15-30分钟让白名单生效');
      console.log('3. 或使用微信开发者工具手动上传（推荐）');
    }
    console.log('='.repeat(80));
  }
  
  // 清理
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
  }
}

upload();
