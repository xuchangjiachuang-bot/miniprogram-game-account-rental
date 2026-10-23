const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

console.log('=== 诊断信息 ===\n');

// 1. 检查私钥文件
const privateKeyPath = path.join(__dirname, 'CONFIGURE_LOCALLY');
const privateKeyContent = `CONFIGURE_LOCALLY`;

fs.writeFileSync(privateKeyPath, privateKeyContent);

// 2. 检查私钥文件格式
console.log('1. 私钥文件检查:');
console.log('   - 文件存在:', fs.existsSync(privateKeyPath));
const stats = fs.statSync(privateKeyPath);
console.log('   - 文件大小:', stats.size, 'bytes');
console.log('   - 是否以BEGIN开头:', privateKeyContent.startsWith('-----BEGIN'));
console.log('   - 是否以END结尾:', privateKeyContent.trim().endsWith('-----END RSA PRIVATE KEY-----'));
console.log('   - 包含的行数:', privateKeyContent.split('\n').length);
console.log('');

// 3. 检查项目文件
console.log('2. 项目文件检查:');
const requiredFiles = ['app.js', 'app.json', 'app.wxss', 'project.config.json'];
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  const size = exists ? fs.statSync(filePath).size : 0;
  console.log(`   - ${file}: ${exists ? '✓' : '✗'} (${size} bytes)`);
}
console.log('');

// 4. 读取project.config.json
console.log('3. project.config.json内容:');
const configPath = path.join(__dirname, 'project.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
console.log('   - appid:', config.appid);
console.log('   - projectname:', config.projectname);
console.log('   - libVersion:', config.libVersion);
console.log('');

// 5. 检查网络连接
console.log('4. 网络连接测试:');
const https = require('https');
const req = https.get('https://api.weixin.qq.com', (res) => {
  console.log('   - 微信服务器: ✓ 可连接 (状态码:', res.statusCode, ')');
  console.log('');
  
  // 6. 尝试获取项目属性
  console.log('5. 尝试获取项目属性:');
  const project = new ci.Project({
    appid: 'wx2382e1949d031ba6',
    type: 'miniProgram',
    projectPath: __dirname,
    privateKeyPath: privateKeyPath,
    ignores: []
  });
  
  project.attr().then(attr => {
    console.log('   - 项目属性获取: ✓ 成功');
    console.log('   - 项目属性:', JSON.stringify(attr, null, 2));
    console.log('');
    
    // 7. 尝试上传
    console.log('6. 尝试上传:');
    const now = new Date();
    const version = `1.0.test.${now.getTime()}`;
    
    ci.upload({
      project,
      version: version,
      desc: '测试上传 v' + version,
      setting: {
        es6: true,
        minify: true
      },
      robot: 1
    }).then(res => {
      console.log('   - 上传: ✓ 成功！');
      console.log('   - 版本:', res.version);
      console.log('');
      
      if (fs.existsSync(privateKeyPath)) {
        fs.unlinkSync(privateKeyPath);
      }
    }).catch(err => {
      console.log('   - 上传: ✗ 失败');
      console.log('   - 错误:', err.message);
      console.log('   - 错误代码:', err.code);
      
      if (fs.existsSync(privateKeyPath)) {
        fs.unlinkSync(privateKeyPath);
      }
    });
    
  }).catch(err => {
    console.log('   - 项目属性获取: ✗ 失败');
    console.log('   - 错误:', err.message);
    console.log('   - 错误代码:', err.code);
    
    if (fs.existsSync(privateKeyPath)) {
      fs.unlinkSync(privateKeyPath);
    }
  });
  
}).on('error', (err) => {
  console.log('   - 微信服务器: ✗ 连接失败');
  console.log('   - 错误:', err.message);
  
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
  }
});
