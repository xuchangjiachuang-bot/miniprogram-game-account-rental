const https = require('https');

async function getCurrentIP() {
  return new Promise((resolve, reject) => {
    https.get('https://checkip.amazonaws.com', (res) => {
      let ip = '';
      res.on('data', chunk => ip += chunk);
      res.on('end', () => resolve(ip.trim()));
    }).on('error', reject).setTimeout(5000, () => reject(new Error('Timeout')));
  });
}

console.log('='.repeat(80));
console.log('📋 IP白名单配置指南');
console.log('='.repeat(80));
console.log();

getCurrentIP().then(ip => {
  console.log('当前IP地址:', ip);
  console.log();
  console.log('='.repeat(80));
  console.log('📝 详细操作步骤');
  console.log('='.repeat(80));
  console.log();
  console.log('步骤 1: 登录微信公众平台');
  console.log('  网址: https://mp.weixin.qq.com/');
  console.log('  使用您的小程序账号登录');
  console.log();
  console.log('步骤 2: 进入开发设置');
  console.log('  菜单: 开发 → 开发管理 → 开发设置');
  console.log();
  console.log('步骤 3: 找到服务器域名');
  console.log('  向下滚动找到"服务器域名"部分');
  console.log();
  console.log('步骤 4: 添加IP白名单');
  console.log('  在"uploadFile合法域名"中添加以下IP:');
  console.log(`    ${ip}`);
  console.log();
  console.log('步骤 5: 保存');
  console.log('  点击"保存"按钮');
  console.log();
  console.log('步骤 6: 等待生效');
  console.log('  等待10-15分钟，让白名单生效');
  console.log();
  console.log('步骤 7: 重新上传');
  console.log('  使用上传命令: cd miniprogram && node upload-clean.js');
  console.log();
  console.log('='.repeat(80));
  console.log('💡 重要提示');
  console.log('='.repeat(80));
  console.log();
  console.log('✓ 每次添加一个IP，不要批量添加');
  console.log('✓ IP格式: 纯IP地址，不要添加端口');
  console.log('✓ 例如: 115.191.1.173 (不是 115.191.1.173:443)');
  console.log('✓ 保存后会显示"修改成功"');
  console.log('✓ 白名单生效需要时间，请耐心等待');
  console.log();
  console.log('如果仍然失败，可能的原因:');
  console.log('1. 白名单还未生效（等待15分钟再试）');
  console.log('2. 当前IP又变化了（重新检测IP并添加）');
  console.log('3. 添加的位置不对（确保在"uploadFile合法域名"中）');
  console.log('4. IP格式错误（确保是纯IP地址）');
  console.log();
  console.log('='.repeat(80));
  console.log('🔗 推荐替代方案');
  console.log('='.repeat(80));
  console.log();
  console.log('由于云端环境IP频繁变化，推荐使用以下替代方案:');
  console.log();
  console.log('方案 1: 使用微信开发者工具手动上传');
  console.log('  - 下载微信开发者工具');
  console.log('  - 打开项目文件夹');
  console.log('  - 点击"上传"按钮');
  console.log('  - 无需配置IP白名单');
  console.log();
  console.log('方案 2: 配置GitHub Actions自动化上传');
  console.log('  - 将代码推送到GitHub仓库');
  console.log('  - 配置GitHub Actions工作流');
  console.log('  - 使用GitHub Actions固定IP（185.199.108.153等）');
  console.log('  - 添加GitHub Actions IP到白名单');
  console.log();
  console.log('='.repeat(80));
}).catch(err => {
  console.log('获取IP失败:', err.message);
});
