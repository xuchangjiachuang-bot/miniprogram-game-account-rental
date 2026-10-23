const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🔍 小程序上传问题深度诊断 v2');
console.log('='.repeat(80));
console.log();

// 1. 检查私钥
const privateKeyContent = `CONFIGURE_LOCALLY`;

console.log('【1. 私钥信息】');
console.log('  长度:', privateKeyContent.length, 'bytes');
console.log('  格式: ✓ (包含BEGIN/END标记)');
console.log('  AppID匹配:', privateKeyContent.includes('wx2382e1949d031ba6') ? '✓' : '✗');
console.log();

// 2. 检查当前IP
console.log('【2. 当前IP检测】');
const https = require('https');
https.get('https://checkip.amazonaws.com', (res) => {
  let ip = '';
  res.on('data', chunk => ip += chunk);
  res.on('end', () => {
    ip = ip.trim();
    console.log('  当前IP:', ip);
    console.log('  是否在白名单:');
    console.log('    - 115.191.1.0/24:', ip.startsWith('115.191.1.') ? '✓' : '✗');
    console.log('    - 101.126.95.0/24:', ip.startsWith('101.126.95.') ? '✓' : '✗');
    console.log('    - 115.190.51.0/24:', ip.startsWith('115.190.51.') ? '✓' : '✗');
    console.log('    - 101.126.128.0/24:', ip.startsWith('101.126.128.') ? '✓' : '✗');
    console.log('    - 115.190.93.0/24:', ip.startsWith('115.190.93.') ? '✓' : '✗');
    console.log('    - 115.190.192.0/24:', ip.startsWith('115.190.192.') ? '✓' : '✗');
    console.log();
    
    // 3. 尝试上传测试
    testUpload(ip);
  });
}).on('error', (err) => {
  console.log('  获取IP失败:', err.message);
});

async function testUpload(ip) {
  console.log('【3. 上传测试】');
  console.log('  正在初始化项目...');
  
  const privateKeyPath = path.join(__dirname, 'CONFIGURE_LOCALLY');
  fs.writeFileSync(privateKeyPath, privateKeyContent);
  
  const project = new ci.Project({
    appid: 'twx2382e1949d031ba6',
    type: 'miniProgram',
    projectPath: __dirname,
    privateKeyPath: privateKeyPath,
    ignores: []
  });
  
  try {
    console.log('  正在上传...');
    await ci.upload({
      project,
      version: '1.0.test',
      desc: '测试上传',
      setting: {
        es6: true,
        minify: true
      },
      robot: 30
    });
    
    console.log('  ✅ 上传成功！');
  } catch (err) {
    console.log('  ❌ 上传失败');
    console.log('  错误:', err.message);
    console.log('  错误代码:', err.code);
    
    console.log();
    console.log('='.repeat(80));
    console.log('📋 诊断结果');
    console.log('='.repeat(80));
    console.log();
    console.log('当前IP:', ip);
    console.log('IP在白名单中:', ip.startsWith('115.190.93.') ? '是' : '否');
    console.log();
    console.log('错误分析:');
    console.log('1. IP白名单可能还未生效（需要等待更长时间）');
    console.log('2. 白名单配置位置可能不对（应该在"服务器域名"中）');
    console.log('3. 可能需要配置"request合法域名"而不是"uploadFile合法域名"');
    console.log('4. 私钥配置可能有问题');
    console.log();
    console.log('建议检查:');
    console.log('1. 登录: https://mp.weixin.qq.com/');
    console.log('2. 进入: 开发 -> 开发管理 -> 开发设置');
    console.log('3. 检查"服务器域名"部分');
    console.log('4. 确认IP添加在正确的位置');
    console.log('5. 等待白名单生效（可能需要15-30分钟）');
  }
  
  // 清理
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
  }
}
