const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

// 创建私钥文件
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

const privateKeyPath = path.join(__dirname, 'private.wx2382e1949d031ba6.key');
fs.writeFileSync(privateKeyPath, privateKeyContent);

console.log('='.repeat(60));
console.log('微信小程序上传工具');
console.log('='.repeat(60));
console.log('');
console.log('项目信息:');
console.log('  AppID:', 'twx2382e1949d031ba6');
console.log('  项目路径:', path.join(__dirname));
console.log('  私钥文件:', privateKeyPath);
console.log('');

// 验证私钥文件
if (!fs.existsSync(privateKeyPath)) {
  console.error('❌ 私钥文件创建失败');
  process.exit(1);
}

const privateKeyStats = fs.statSync(privateKeyPath);
console.log('私钥文件大小:', privateKeyStats.size, 'bytes');
console.log('');

// 项目配置
const projectConfig = {
  appid: 'twx2382e1949d031ba6',
  type: 'miniProgram',
  projectPath: path.join(__dirname),
  privateKeyPath: privateKeyPath,
  ignores: []
};

// 验证项目路径
if (!fs.existsSync(projectConfig.projectPath)) {
  console.error('❌ 项目路径不存在:', projectConfig.projectPath);
  process.exit(1);
}

// 验证必要文件
const requiredFiles = [
  'app.js',
  'app.json',
  'app.wxss',
  'project.config.json',
  'sitemap.json'
];

console.log('检查必要文件:');
for (const file of requiredFiles) {
  const filePath = path.join(projectConfig.projectPath, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${file}: ${exists ? '✓' : '✗'}`);
  
  if (!exists) {
    console.error(`❌ 缺少必要文件: ${file}`);
    process.exit(1);
  }
}

console.log('');
console.log('开始上传...');
console.log('='.repeat(60));
console.log('');

// 创建项目
const project = new ci.Project(projectConfig);

// 获取当前时间作为版本号的一部分
const now = new Date();
const version = `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

console.log('上传信息:');
console.log('  版本号:', version);
console.log('  描述:', '游戏账号租赁平台小程序 - 初始版本 v' + version);
console.log('  Robot:', 30); // 使用较大的robot编号，避免冲突
console.log('');

// 上传
ci.upload({
  project,
  version: version,
  desc: '游戏账号租赁平台小程序 - 初始版本 v' + version,
  setting: {
    es6: true,
    es7: true,
    minify: true,
    codeProtect: true,
    autoPrefixWXSS: true
  },
  onProgressUpdate: (res) => {
    console.log('上传进度:', JSON.stringify(res));
  },
  robot: 30
}).then(res => {
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ 上传成功！');
  console.log('='.repeat(60));
  console.log('版本号:', res.version);
  console.log('上传时间:', new Date(res.time).toLocaleString());
  console.log('');
  console.log('下一步操作:');
  console.log('  1. 登录微信公众平台: https://mp.weixin.qq.com');
  console.log('  2. 进入: 管理 -> 版本管理');
  console.log('  3. 查看上传的版本');
  console.log('  4. 点击"提交审核"');
  console.log('  5. 填写审核信息并提交');
  console.log('');
  
  // 清理私钥文件
  setTimeout(() => {
    if (fs.existsSync(privateKeyPath)) {
      fs.unlinkSync(privateKeyPath);
      console.log('私钥文件已清理');
    }
  }, 5000);
}).catch(err => {
  console.log('');
  console.log('='.repeat(60));
  console.log('❌ 上传失败！');
  console.log('='.repeat(60));
  console.log('错误信息:', err.message);
  console.log('错误代码:', err.code);
  console.log('');
  console.log('可能的原因:');
  console.log('  1. IP白名单还没有生效（可能需要等待5-10分钟）');
  console.log('  2. 私钥文件格式不正确');
  console.log('  3. 网络连接问题');
  console.log('  4. 微信服务器暂时不可用');
  console.log('');
  console.log('建议操作:');
  console.log('  1. 确认IP白名单已正确添加');
  console.log('  2. 等待5-10分钟后重试');
  console.log('  3. 检查私钥文件是否正确');
  console.log('  4. 联系微信技术支持');
  console.log('');
  
  // 清理私钥文件
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
    console.log('私钥文件已清理');
  }
  
  process.exit(1);
});
