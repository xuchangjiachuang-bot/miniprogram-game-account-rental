const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🔍 小程序代码全面检查');
console.log('='.repeat(80));
console.log();

// 检查所有JS文件
const jsFiles = [];
function findJSFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findJSFiles(fullPath);
    } else if (file.endsWith('.js')) {
      jsFiles.push(fullPath);
    }
  });
}

findJSFiles(__dirname);

console.log(`找到 ${jsFiles.length} 个JS文件\n`);

// 检查问题
const issues = [];

jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = file.replace(__dirname + '/', '');
  
  // 检查1: process对象使用
  if (content.includes('process.')) {
    issues.push({
      file: relativePath,
      type: 'process',
      desc: '使用了Node.js的process对象（小程序不支持）'
    });
  }
  
  // 检查2: require路径问题
  const requireMatches = content.match(/require\(['"`](.*?)['"`]\)/g);
  if (requireMatches) {
    requireMatches.forEach(match => {
      const modulePath = match.match(/require\(['"`](.*?)['"`]\)/)[1];
      // 检查是否引用了node_modules
      if (modulePath.startsWith('../') || modulePath.startsWith('./')) {
        const requiredPath = path.join(path.dirname(file), modulePath + '.js');
        if (!fs.existsSync(requiredPath) && !fs.existsSync(requiredPath.replace('.js', '.json'))) {
          issues.push({
            file: relativePath,
            type: 'require',
            desc: `require路径可能有问题: ${modulePath}`
          });
        }
      }
    });
  }
  
  // 检查3: module.exports vs exports
  if (content.includes('exports.') && !content.includes('module.exports')) {
    issues.push({
      file: relativePath,
      type: 'exports',
      desc: '使用了exports而不是module.exports（可能有问题）'
    });
  }
  
  // 检查4: const/let/var混用
  if (content.includes('var ') && content.includes('const ')) {
    issues.push({
      file: relativePath,
      type: 'style',
      desc: '混用var和const/let（建议统一）'
    });
  }
});

// 输出结果
console.log('='.repeat(80));
console.log('📋 检查结果');
console.log('='.repeat(80));
console.log();

if (issues.length === 0) {
  console.log('✅ 没有发现明显问题！');
} else {
  console.log(`⚠️  发现 ${issues.length} 个潜在问题：\n`);
  
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.file}`);
    console.log(`   类型: ${issue.type}`);
    console.log(`   描述: ${issue.desc}`);
    console.log();
  });
}

// 检查关键文件
console.log('='.repeat(80));
console.log('📄 关键文件检查');
console.log('='.repeat(80));
console.log();

const keyFiles = [
  'app.js',
  'app.json',
  'app.wxss',
  'project.config.json',
  'sitemap.json'
];

keyFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file} (${fs.statSync(filePath).size} bytes)`);
  } else {
    console.log(`✗ ${file} (缺失)`);
  }
});

console.log();
console.log('='.repeat(80));
console.log('🔗 页面配置检查');
console.log('='.repeat(80));
console.log();

// 检查app.json中的页面配置
const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8'));
console.log('配置的页面:');
appJson.pages.forEach(page => {
  const pagePath = path.join(__dirname, page + '.js');
  if (fs.existsSync(pagePath)) {
    console.log(`✓ ${page}`);
  } else {
    console.log(`✗ ${page} (文件缺失)`);
  }
});

console.log();
console.log('='.repeat(80));
console.log('✅ 检查完成');
console.log('='.repeat(80));
