const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

const privateKeyContent = `CONFIGURE_LOCALLY`;

console.log('='.repeat(80));
console.log('🚀 使用正确的AppID尝试上传');
console.log('='.repeat(80));
console.log();
console.log('AppID: wx2382e1949d031ba6');
console.log();

const privateKeyPath = path.join(__dirname, 'CONFIGURE_LOCALLY');
fs.writeFileSync(privateKeyPath, privateKeyContent);

async function upload() {
  const project = new ci.Project({
    appid: 'wx2382e1949d031ba6', // 使用完整的AppID
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
    console.log('='.repeat(80));
    
  } catch (err) {
    console.log();
    console.log('='.repeat(80));
    console.log('❌ 上传失败');
    console.log('='.repeat(80));
    console.log('错误:', err.message);
    console.log('错误代码:', err.code);
    console.log();
    console.log('可能的原因:');
    console.log('1. IP白名单配置位置不对（应该在"服务器域名"的"request合法域名"中）');
    console.log('2. 白名单还未生效（需要等待15-30分钟）');
    console.log('3. 私钥配置不正确');
    console.log('4. 微信服务器端问题');
    console.log();
    console.log('建议:');
    console.log('1. 检查微信后台的IP白名单配置');
    console.log('2. 确认IP添加在"request合法域名"而不是"uploadFile合法域名"中');
    console.log('3. 等待白名单生效后再试');
    console.log('4. 使用微信开发者工具手动上传（推荐）');
    console.log('='.repeat(80));
  }
  
  // 清理
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
  }
}

upload();
