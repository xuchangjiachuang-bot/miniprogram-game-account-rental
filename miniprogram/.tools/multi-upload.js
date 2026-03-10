const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

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

async function tryUpload(attempt, robot) {
  console.log('\n' + '='.repeat(60));
  console.log(`第 ${attempt} 次上传尝试`);
  console.log(`Robot: ${robot}`);
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(60));

  const projectConfig = {
    appid: 'wx2382e1949d031ba6',
    type: 'miniProgram',
    projectPath: path.join(__dirname),
    privateKeyPath: privateKeyPath,
    ignores: []
  };

  const project = new ci.Project(projectConfig);
  const now = new Date();
  const version = `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

  try {
    await ci.upload({
      project,
      version: version,
      desc: `游戏账号租赁平台小程序 - 第${attempt}次尝试`,
      setting: {
        es6: true,
        minify: true
      },
      robot: robot
    });
    
    console.log('\n✅ 上传成功！');
    console.log('版本:', version);
    console.log('时间:', new Date().toLocaleString('zh-CN'));
    return true;
  } catch (err) {
    console.log('\n❌ 上传失败');
    console.log('错误:', err.message);
    console.log('错误代码:', err.code);
    return false;
  }
}

async function main() {
  console.log('开始多次上传尝试...\n');
  console.log('当前IP:', await getCurrentIP());
  
  const robots = [1, 2, 3, 4, 5, 10, 20, 30, 40, 50];
  let success = false;
  
  for (let i = 0; i < robots.length; i++) {
    const robot = robots[i];
    success = await tryUpload(i + 1, robot);
    
    if (success) {
      break;
    }
    
    // 等待5秒再重试
    if (i < robots.length - 1) {
      console.log('\n等待5秒后重试...');
      await sleep(5000);
    }
  }
  
  // 清理私钥
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
    console.log('\n私钥文件已清理');
  }
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ 上传成功！');
  } else {
    console.log('❌ 所有尝试都失败了');
  }
  console.log('='.repeat(60));
}

function getCurrentIP() {
  const https = require('https');
  return new Promise((resolve) => {
    https.get('https://ifconfig.me', (res) => {
      let ip = '';
      res.on('data', chunk => ip += chunk);
      res.on('end', () => resolve(ip));
    }).on('error', () => resolve('未知'));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
