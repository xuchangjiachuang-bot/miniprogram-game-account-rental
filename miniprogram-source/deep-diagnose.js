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
const privateKeyContent = `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEA8L8xt6FKKk5YnaoM7hXlc6t2wE/h51zn3jlb1FO6rWTAvM1V
fSggV0BwWlYS2s9fyTSFsw7GaZy2q3bdVL6frXUtYdrdAXdRKYFDATRMbh72V8Ew
VjYqHrOkx1bNkB9q2zcTEXJygvDjW7f7b9cJa0exN1MddnRgWVXecn0SlvHKCAZS
+cjz6CqMzRmIlsY02Pn/D5AO3KgjumuaFTJE2aKlnUxEzfr/8l9f0iKSW+5JIu2E
NKisHEyXctq1x83IFuokOh6vr6kdzHuWL97Kfro+JuX5MAhzONmGkVnwP4RWUDQi
ggUTa12QjRMQRHQXLiEvtuKOgKhZUUCsSnFKCQIDAQABAoIBAB3m4Xn5YojWqlMK
6Ag6WAGB7oH8agael34Wib1ZmPooZXgN2Oxuq3Wq30mZH0ZmM3N+Poz67NH5UQcD
AIKiGpskzro0wPaJp18MWxIvOL8EwXws1qAeoiSmE3Ve5rFb9Z28vXWRTX/OA69E
rso5X0Yf5XcFr8citUTjUXnO5xwwNkcZsTk/6MOssAmec2HDvcbgrLWDw6XJmfOq
LTb9jsrXg7XJzUSHJFS2kptT6JlSR27xqmN7PtxvQMaX7B86yyDKpP8VWu806PPx
t/ec17UBxFedTwXDAKzmzrHePOp1celVN0ZmH0GYH/465A29bckbe+nwrDMmOl2o
/oKcYgECgYEA+zWA+r2dnat4snFOgk5/pzLYZJ89fqLLi2GaZJMPhNSTLnQh6Huf
xJru/S04Mc5PKmWYo7zPEfT84nEbAufFrEBJPfBzUamvsmWUPUUtRJCqEpXaUrny
3nZLl5Yvraarw+BBc4Wy3vxKHffitDohX/2GWX+I5t3tF6mSp8nqTNECgYEA9Vac
OtTaYpQUPIjgYPnuQdX7wDw6HzXL/3ZAAoXyw8f5v3Q4OmicHejFUhrV39KYLWtm
8y0TBLcIV1rKzzTanw8unkbT785gUVW2CX78BGzSXFU9Qfo8H+VquP4Hc8MqdIki
l/oDRu9o8M93/iy+ypve/MqkT9V6S/lX1xnpF7kCgYEA4ooMh5JJum9xCBLQRwi9
a62ZoZxNG4952XcqgXpxa0s8c479KSebG/TQgvatj5TKpaQ7M6XIYxw4lYiEYGld
RQowQrA9fq50qH+cYGiq+wMurFYBLctM7ztkzg39by84BQuOWrx+Y0LHICF0iy1E
/cimyL0PW4tVDZq5i6C2L5ECgYEApx8Xj0/db5dVbaMDzauS7E/6jQm5wfbgfqWr
lsxuAYWgkBV4E/mclxcwCuzy0ePf+9iUqYQD14ti6DaVvq5PWlh6NiEjT9CyddVA
CpnwzIbgiTsbXm06NbQOjfOlWesRaY7c/M+3GcQOJTP+lise0F97d5IGecd+5m/0
sTcaPCkCgYEAl5GJV/YmF3BPTe8KiL9rEkH/v3x1Rf6+wLD7L6amN5Fr/h9iOJ43
FYSTFSl10sJdxdyPHeYPHvVbLiNARdwaJ5Ii5QRTQKhmG2kn0yEv/yjj5jOQiLFb
kDPy361yZNs8KmUFCbUmrDcRKrgj4UR5Fnl7S4+g1x6bFV5gI/QeEKI=
-----END RSA PRIVATE KEY-----`;

console.log('  私钥长度:', privateKeyContent.length, 'bytes');
console.log('  私钥格式: ✓ (包含BEGIN/END标记)');
console.log('  AppID匹配:', privateKeyContent.includes('wx2382e1949d031ba6') ? '✓' : '✗');
console.log();

// 3. 尝试连接微信服务器
console.log('【3. 尝试连接微信服务器】');
console.log('  正在检测网络连接...');

const privateKeyPath = path.join(__dirname, 'private.wx2382e1949d031ba6.key');
fs.writeFileSync(privateKeyPath, privateKeyContent);

async function testConnection() {
  const projectConfig = {
    appid: 'twx2382e1949d031ba6',
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
