const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

// 创建私钥文件
const privateKeyContent = `CONFIGURE_LOCALLY`;

const privateKeyPath = path.join(__dirname, 'CONFIGURE_LOCALLY');
fs.writeFileSync(privateKeyPath, privateKeyContent);

async function tryUpload(attempt, robot) {
  console.log('\n' + '='.repeat(60));
  console.log(`第 ${attempt} 次上传尝试`);
  console.log(`Robot: ${robot}`);
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(60));

  const projectConfig = {
    appid: 'twx2382e1949d031ba6',
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
