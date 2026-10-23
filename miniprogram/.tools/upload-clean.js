const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');

const privateKeyContent = `CONFIGURE_LOCALLY`;

const privateKeyPath = path.join(__dirname, 'CONFIGURE_LOCALLY');
fs.writeFileSync(privateKeyPath, privateKeyContent);

async function upload() {
  console.log('='.repeat(80));
  console.log('🚀 小程序上传 - 精简模式');
  console.log('='.repeat(80));
  console.log();
  
  const project = new ci.Project({
    appid: 'wx2382e1949d031ba6',
    type: 'miniProgram',
    projectPath: __dirname,
    privateKeyPath: privateKeyPath,
    ignores: []
  });
  
  const now = new Date();
  const version = `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  
  console.log('上传信息:');
  console.log('  版本号:', version);
  console.log('  描述:', '游戏账号租赁平台小程序');
  console.log('  Robot:', 30);
  console.log();
  
  try {
    console.log('正在上传...');
    const uploadResult = await ci.upload({
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
    console.log('结果:', JSON.stringify(uploadResult, null, 2));
    console.log('='.repeat(80));
    
  } catch (err) {
    console.log();
    console.log('='.repeat(80));
    console.log('❌ 上传失败');
    console.log('='.repeat(80));
    console.log('错误:', err.message);
    console.log('错误代码:', err.code);
    console.log('错误详情:');
    console.log(JSON.stringify(err, null, 2));
    console.log('='.repeat(80));
    console.log();
    console.log('🔍 错误分析:');
    
    if (err.message && err.message.includes('empty content')) {
      console.log('错误类型: IP白名单问题');
      console.log('说明: 当前IP不在微信小程序后台的IP白名单中');
      console.log();
      console.log('解决步骤:');
      console.log('1. 登录: https://mp.weixin.qq.com/');
      console.log('2. 进入: 开发 -> 开发管理 -> 开发设置');
      console.log('3. 找到: 服务器域名');
      console.log('4. 在"uploadFile合法域名"中添加IP');
      console.log('5. 等待10-15分钟生效');
      console.log('6. 重新尝试上传');
    } else {
      console.log('错误类型: 未知错误');
      console.log('建议: 联系微信技术支持');
    }
  }
  
  // 清理私钥
  if (fs.existsSync(privateKeyPath)) {
    fs.unlinkSync(privateKeyPath);
  }
}

upload();
