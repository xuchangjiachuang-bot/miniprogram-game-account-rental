const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

const privateKeyContent = `CONFIGURE_LOCALLY`;

const privateKeyPath = path.join(__dirname, 'CONFIGURE_LOCALLY');
fs.writeFileSync(privateKeyPath, privateKeyContent);

async function tryUpload(robot) {
  console.log(`\n尝试 Robot: ${robot}`);
  console.log('-'.repeat(60));
  
  const project = new ci.Project({
    appid: 'wx2382e1949d031ba6',
    type: 'miniProgram',
    projectPath: __dirname,
    privateKeyPath: privateKeyPath,
    ignores: []
  });
  
  const now = new Date();
  const version = `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  
  try {
    await ci.upload({
      project,
      version: version,
      desc: `游戏账号租赁平台小程序 - Robot ${robot}`,
      setting: {
        es6: true,
        minify: true
      },
      robot: robot
    });
    
    console.log('✅ 成功！');
    console.log(`版本: ${version}`);
    console.log(`Robot: ${robot}`);
    return true;
  } catch (err) {
    console.log(`❌ 失败: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 小程序上传 - 多Robot尝试');
  console.log('='.repeat(80));
  console.log(`当前IP: ${require('https').get('https://checkip.amazonaws.com', res => {
    let ip = '';
    res.on('data', chunk => ip += chunk);
    res.on('end', () => console.log(ip.trim()));
  })}`);
  console.log();
  
  // 尝试多个robot
  const robots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50];
  let success = false;
  
  for (const robot of robots) {
    success = await tryUpload(robot);
    if (success) break;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n' + '='.repeat(80));
  if (success) {
    console.log('✅ 上传成功！');
  } else {
    console.log('❌ 所有尝试都失败了');
    console.log();
    console.log('可能的问题:');
    console.log('1. IP白名单还未生效（需要等待更长时间）');
    console.log('2. 白名单配置位置不对（应该在"开发设置"中）');
    console.log('3. 私钥权限问题');
    console.log('4. 网络连接问题');
  }
  console.log('='.repeat(80));
  
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
  }
}

main();
