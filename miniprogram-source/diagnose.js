const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

console.log('=== 诊断信息 ===\n');

// 1. 检查私钥文件
const privateKeyPath = path.join(__dirname, 'private.wx2382e1949d031ba6.key');
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
    appid: 'twx2382e1949d031ba6',
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
