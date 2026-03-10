#!/usr/bin/env node

/**
 * 小程序上传配置检查脚本
 * 检查所有上传配置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🔍 小程序上传配置检查');
console.log('='.repeat(80));
console.log('');

let allPassed = true;

// 检查项列表
const checks = [];

// 1. 检查 miniprogram-ci
checks.push({
  name: 'miniprogram-ci 安装',
  check: () => {
    try {
      const ci = require('miniprogram-ci');
      return { success: true, message: `已安装，版本: ${ci.version || '2.1.26'}` };
    } catch (e) {
      return { success: false, message: '未安装，运行: cd miniprogram && pnpm install' };
    }
  }
});

// 2. 检查私钥文件
checks.push({
  name: '私钥文件',
  check: () => {
    const privateKeyPath = path.join(__dirname, 'miniprogram', 'private.key');
    if (!fs.existsSync(privateKeyPath)) {
      return { success: false, message: `文件不存在: ${privateKeyPath}` };
    }

    try {
      const stats = fs.statSync(privateKeyPath);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);

      if (mode !== '600') {
        return {
          success: false,
          message: `权限不安全（当前: ${mode}，建议: 600）`,
          fix: `运行: chmod 600 ${privateKeyPath}`
        };
      }

      const size = stats.size;
      return {
        success: true,
        message: `存在，权限: ${mode}，大小: ${size} 字节`
      };
    } catch (e) {
      return { success: false, message: `检查失败: ${e.message}` };
    }
  }
});

// 3. 检查项目路径
checks.push({
  name: '项目路径',
  check: () => {
    const projectPath = path.join(__dirname, 'miniprogram');
    if (!fs.existsSync(projectPath)) {
      return { success: false, message: `项目路径不存在: ${projectPath}` };
    }

    // 检查必要文件
    const appJsonPath = path.join(projectPath, 'app.json');
    if (!fs.existsSync(appJsonPath)) {
      return { success: false, message: `app.json 不存在` };
    }

    return { success: true, message: `存在，必要文件已检查` };
  }
});

// 4. 检查上传脚本
checks.push({
  name: '上传脚本',
  check: () => {
    const scripts = [
      path.join(__dirname, '一键上传.sh'),
      path.join(__dirname, 'upload-miniprogram.sh'),
      path.join(__dirname, 'upload-wechat-miniprogram.js'),
      path.join(__dirname, 'miniprogram', 'upload-miniprogram.sh')
    ];

    const missing = scripts.filter(s => !fs.existsSync(s));
    if (missing.length > 0) {
      return {
        success: false,
        message: `缺少脚本: ${missing.map(s => path.basename(s)).join(', ')}`
      };
    }

    return {
      success: true,
      message: `所有脚本存在（${scripts.length}个）`
    };
  }
});

// 5. 检查 AppID
checks.push({
  name: 'AppID 配置',
  check: () => {
    const uploadScriptPath = path.join(__dirname, 'upload-wechat-miniprogram.js');
    if (!fs.existsSync(uploadScriptPath)) {
      return { success: false, message: '上传脚本不存在' };
    }

    const content = fs.readFileSync(uploadScriptPath, 'utf8');
    const match = content.match(/appid:\s*['"]([^'"]+)['"]/);

    if (!match) {
      return { success: false, message: '未找到 AppID 配置' };
    }

    const appid = match[1];
    if (!appid || !appid.startsWith('wx')) {
      return { success: false, message: `AppID 格式不正确: ${appid}` };
    }

    return { success: true, message: `已配置: ${appid}` };
  }
});

// 执行检查
console.log('正在检查配置...\n');

checks.forEach((check, index) => {
  const result = check.check();

  if (result.success) {
    console.log(`✅ [${index + 1}/${checks.length}] ${check.name}`);
    console.log(`   ${result.message}`);
  } else {
    console.log(`❌ [${index + 1}/${checks.length}] ${check.name}`);
    console.log(`   ${result.message}`);
    if (result.fix) {
      console.log(`   💡 修复: ${result.fix}`);
    }
    allPassed = false;
  }

  console.log('');
});

// 总结
console.log('='.repeat(80));

if (allPassed) {
  console.log('🎉 所有检查通过！配置正确。');
  console.log('');
  console.log('可以开始上传了：');
  console.log('');
  console.log('  ./一键上传.sh');
  console.log('  cd miniprogram && npm run upload');
  console.log('  bash upload-miniprogram.sh');
  console.log('  node upload-wechat-miniprogram.js');
} else {
  console.log('⚠️  配置检查失败，请修复上述问题后再上传。');
  console.log('');
  console.log('详细文档：');
  console.log('  docs/UPLOAD_QUICK_GUIDE.md');
  console.log('  UPLOAD_WECHAT_GUIDE.md');
}

console.log('='.repeat(80));

process.exit(allPassed ? 0 : 1);
