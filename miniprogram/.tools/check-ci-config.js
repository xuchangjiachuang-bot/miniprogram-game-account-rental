console.log('='.repeat(80));
console.log('🔍 小程序CI上传配置诊断');
console.log('='.repeat(80));
console.log();

console.log('📋 步骤1: 检查配置文件');
console.log('-'.repeat(80));
console.log();

// 读取project.config.json
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../project.config.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  console.log('✓ project.config.json 存在');
  console.log('  AppID:', config.appid);
  console.log('  Project:', config.projectname);
  console.log();
}

console.log('📋 步骤2: 检查IP白名单配置位置');
console.log('-'.repeat(80));
console.log();
console.log('⚠️  重要: miniprogram-ci 的IP白名单配置位置');
console.log();
console.log('❌ 错误位置: 服务器域名 → uploadFile合法域名');
console.log('  这个是用于小程序内上传文件的域名白名单');
console.log();
console.log('✅ 正确位置: 开发 → 开发管理 → 开发设置 → 服务器IP白名单');
console.log('  这个是用于小程序CI上传、云开发的IP白名单');
console.log();
console.log('🔗 请检查是否在以下位置配置:');
console.log('  1. 登录 https://mp.weixin.qq.com/');
console.log('  2. 开发 → 开发管理 → 开发设置');
console.log('  3. 找到【服务器IP白名单】（不是服务器域名）');
console.log('  4. 添加IP段: 115.190.192.0/24');
console.log();

console.log('📋 步骤3: 检查IP是否在白名单范围内');
console.log('-'.repeat(80));
console.log();

const currentIP = '115.190.192.22';
const whitelistCIDRs = [
  '115.191.1.0/24',
  '115.190.93.0/24',
  '115.190.51.0/24',
  '101.126.95.0/24',
  '115.190.192.0/24',
  '101.126.128.0/24'
];

function isIPInCIDR(ip, cidr) {
  const [network, prefix] = cidr.split('/');
  const prefixLength = parseInt(prefix);

  const ipParts = ip.split('.').map(Number);
  const networkParts = network.split('.').map(Number);

  const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const networkNum = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];

  const mask = (0xFFFFFFFF << (32 - prefixLength)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
}

console.log('当前IP:', currentIP);
console.log();
console.log('白名单段检查:');
let found = false;
whitelistCIDRs.forEach(cidr => {
  const inRange = isIPInCIDR(currentIP, cidr);
  const status = inRange ? '✅' : '❌';
  console.log(`  ${status} ${cidr}`);
  if (inRange) found = true;
});

console.log();
if (found) {
  console.log('✓ 当前IP在白名单范围内');
} else {
  console.log('✗ 当前IP不在白名单范围内');
}
console.log();

console.log('📋 步骤4: 可能的错误原因');
console.log('-'.repeat(80));
console.log();
console.log('1. ⏱️  白名单刚配置，还未生效');
console.log('   - 等待时间: 10-15分钟');
console.log('   - 建议: 稍后重试');
console.log();
console.log('2. ❌ 配置位置错误');
console.log('   - 当前IP在白名单范围内但仍然报错');
console.log('   - 可能是在"服务器域名"而非"服务器IP白名单"中配置');
console.log('   - 建议: 检查配置位置是否正确');
console.log();
console.log('3. 🔑 AppID或权限问题');
console.log('   - CI工具的AppID配置是否正确');
console.log('   - 是否有上传权限');
console.log('   - 建议: 检查project.config.json中的appid');
console.log();
console.log('4. 🌐 网络问题');
console.log('   - 服务器到微信的网络连接不稳定');
console.log('   - 建议: 检查网络连接，稍后重试');
console.log();

console.log('📋 步骤5: 推荐操作');
console.log('-'.repeat(80));
console.log();
console.log('方案A: 等待并重试（快速方案）');
console.log('  1. 等待15分钟让白名单生效');
console.log('  2. 重新执行: cd miniprogram && node .tools/upload-clean.js');
console.log();
console.log('方案B: 检查配置位置');
console.log('  1. 登录微信公众平台');
console.log('  2. 确认在【服务器IP白名单】中配置（不是服务器域名）');
console.log('  3. 如果位置不对，移到正确位置后等待15分钟');
console.log();
console.log('方案C: 使用微信开发者工具（最稳定）');
console.log('  1. 下载微信开发者工具');
console.log('  2. 打开项目');
console.log('  3. 点击"上传"按钮');
console.log('  4. 无需配置IP白名单');
console.log();

console.log('='.repeat(80));
