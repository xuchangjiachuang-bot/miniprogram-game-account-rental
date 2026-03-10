const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

console.log('='.repeat(60));
console.log('微信小程序上传工具（安全版）');
console.log('='.repeat(60));
console.log('');

// 配置
const projectConfig = {
  appid: 'wx2382e1949d031ba6', // 修正了 AppID
  type: 'miniProgram',
  projectPath: __dirname,
  privateKeyPath: process.env.MINIPROGRAM_PRIVATE_KEY_PATH || path.join(__dirname, 'private.key'),
  ignores: []
};

console.log('项目信息:');
console.log('  AppID:', projectConfig.appid);
console.log('  项目路径:', projectConfig.projectPath);
console.log('  私钥文件:', projectConfig.privateKeyPath);
console.log('');

// 验证私钥文件
if (!fs.existsSync(projectConfig.privateKeyPath)) {
  console.error('❌ 私钥文件不存在');
  console.error('');
  console.error('请按以下步骤配置私钥：');
  console.error('1. 登录微信小程序后台：https://mp.weixin.qq.com/');
  console.error('2. 进入：开发 -> 开发管理 -> 开发设置');
  console.error('3. 找到"小程序代码上传"部分');
  console.error('4. 点击"生成"或"重置"私钥');
  console.error('5. 下载私钥文件并重命名为：private.key');
  console.error('6. 放置到以下位置：' + projectConfig.privateKeyPath);
  console.error('7. 设置文件权限：chmod 600 ' + projectConfig.privateKeyPath);
  console.error('');
  console.error('或者设置环境变量：');
  console.error('export MINIPROGRAM_PRIVATE_KEY_PATH=/path/to/private.key');
  process.exit(1);
}

// 检查文件权限
try {
  const stats = fs.statSync(projectConfig.privateKeyPath);
  const mode = (stats.mode & parseInt('777', 8)).toString(8);
  if (mode !== '600') {
    console.warn('⚠️  私钥文件权限不安全（当前: ' + mode + '，建议: 600）');
    console.warn('运行: chmod 600 ' + projectConfig.privateKeyPath);
    console.warn('');
  }
} catch (e) {
  console.warn('⚠️  无法检查私钥文件权限');
  console.warn('');
}

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
let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(projectConfig.projectPath, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${file}: ${exists ? '✓' : '✗'}`);

  if (!exists) {
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('');
  console.error('❌ 缺少必要文件');
  process.exit(1);
}

console.log('');

// 获取版本号（从命令行参数或自动生成）
let version = process.argv[2];
if (!version) {
  const now = new Date();
  version = `1.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
}

// 获取描述（从命令行参数或默认）
const description = process.argv.slice(3).join(' ') || '游戏账号租赁平台小程序';

console.log('上传信息:');
console.log('  版本号:', version);
console.log('  描述:', description);
console.log('  Robot:', 30); // 使用较大的robot编号，避免冲突
console.log('');
console.log('开始上传...');
console.log('='.repeat(60));
console.log('');

// 创建项目
const project = new ci.Project(projectConfig);

// 上传
ci.upload({
  project,
  version: version,
  desc: description,
  setting: {
    es6: true,
    es7: true,
    minify: true,
    codeProtect: true,
    autoPrefixWXSS: true
  },
  onProgressUpdate: (res) => {
    console.log('上传进度:', res.progress + '%');
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
}).catch(err => {
  console.log('');
  console.log('='.repeat(60));
  console.log('❌ 上传失败！');
  console.log('='.repeat(60));
  console.error('错误信息:', err.message);
  if (err.code) {
    console.error('错误代码:', err.code);
  }
  console.error('');
  console.error('可能的原因:');
  console.error('  1. IP白名单还没有生效（可能需要等待5-10分钟）');
  console.error('  2. 私钥文件格式不正确');
  console.error('  3. 网络连接问题');
  console.error('  4. 微信服务器暂时不可用');
  console.error('');
  console.error('建议操作:');
  console.error('  1. 确认IP白名单已正确添加');
  console.error('  2. 等待5-10分钟后重试');
  console.error('  3. 检查私钥文件是否正确');
  console.error('  4. 联系微信技术支持');
  console.error('');
  process.exit(1);
});
