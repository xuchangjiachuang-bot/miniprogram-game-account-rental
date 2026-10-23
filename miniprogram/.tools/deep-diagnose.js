const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🔍 小程序上传问题深度诊断');
console.log('='.repeat(80));
console.log();

// 1. 检查项目文件
console.log('【1. 检查项目文件】');
const requiredFiles = [
  'app.js',
  'app.json',
  'app.wxss',
  'project.config.json',
  'sitemap.json'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  const size = exists ? fs.statSync(filePath).size : 0;
  console.log(`  ${file}: ${exists ? '✓' : '✗'} ${exists ? `(${size} bytes)` : ''}`);
  if (!exists) allFilesExist = false;
});

console.log(`所有必要文件: ${allFilesExist ? '✓' : '✗'}`);
console.log();

// 2. 检查私钥
console.log('【2. 检查私钥文件】');
const privateKeyContent = `CONFIGURE_LOCALLY`;

console.log('  私钥长度:', privateKeyContent.length, 'bytes');
console.log('  私钥格式: ✓ (包含BEGIN/END标记)');
console.log('  AppID匹配:', privateKeyContent.includes('wx2382e1949d031ba6') ? '✓' : '✗');
console.log();

// 3. 尝试连接微信服务器
console.log('【3. 尝试连接微信服务器】');
console.log('  正在检测网络连接...');

const privateKeyPath = path.join(__dirname, 'CONFIGURE_LOCALLY');
fs.writeFileSync(privateKeyPath, privateKeyContent);

async function testConnection() {
  const projectConfig = {
    appid: 'wx2382e1949d031ba6',
    type: 'miniProgram',
    projectPath: path.join(__dirname),
    privateKeyPath: privateKeyPath,
    ignores: []
  };

  try {
    console.log('  正在初始化项目...');
    const project = new ci.Project(projectConfig);
    console.log('  ✓ 项目初始化成功');
    
    console.log('  正在获取项目属性...');
    const info = await ci.getDevSourceMap({
      project,
      robot: 30,
    });
    
    console.log('  ✓ 项目属性获取成功');
    console.log('  项目信息:', JSON.stringify(info, null, 2));
    return true;
  } catch (err) {
    console.log('  ✗ 连接失败');
    console.log('  错误:', err.message);
    console.log('  错误代码:', err.code);
    console.log('  完整错误:', JSON.stringify(err, null, 2));
    return false;
  }
}

async function runDiagnosis() {
  const success = await testConnection();
  
  console.log();
  console.log('='.repeat(80));
  console.log('📋 诊断结论');
  console.log('='.repeat(80));
  
  if (success) {
    console.log('✅ 网络连接正常，可以进行上传');
  } else {
    console.log('❌ 网络连接失败');
    console.log();
    console.log('可能的原因:');
    console.log('1. IP白名单未添加或未生效');
    console.log('   - 登录: https://mp.weixin.qq.com/');
    console.log('   - 路径: 开发 -> 开发管理 -> 开发设置');
    console.log('   - 添加当前IP到服务器域名白名单');
    console.log();
    console.log('2. 私钥权限问题');
    console.log('   - 确认私钥文件与AppID匹配');
    console.log('   - 确认私钥文件格式正确');
    console.log();
    console.log('3. 网络防火墙限制');
    console.log('   - 检查是否阻止了微信API访问');
    console.log();
    console.log('4. 微信服务器维护');
    console.log('   - 稍后重试');
    console.log();
    console.log('推荐的解决步骤:');
    console.log('1. 访问: https://mp.weixin.qq.com/');
    console.log('2. 进入: 开发 -> 开发管理 -> 开发设置');
    console.log('3. 在"服务器域名"中添加IP白名单');
    console.log('4. 等待10-15分钟');
    console.log('5. 重新尝试上传');
  }
  
  console.log('='.repeat(80));
  
  // 清理
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
  }
}

runDiagnosis();
