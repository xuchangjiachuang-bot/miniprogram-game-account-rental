/**
 * 批量修改跳转登录页的逻辑
 */
const fs = require('fs');
const path = require('path');

const filesToFix = [
  {
    file: path.join(__dirname, '../pages/account/detail/index.js'),
    replacements: [
      {
        oldStr: `url: '/pages/auth/login/index'`,
        newStr: `// 显示登录弹窗，不跳转
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage && typeof currentPage.showLoginModal === 'function') {
          currentPage.showLoginModal();
        }`
      }
    ]
  },
  {
    file: path.join(__dirname, '../pages/index/index.js'),
    replacements: [
      {
        oldStr: `url: '/pages/auth/login/index'`,
        newStr: `// 显示登录弹窗，不跳转
        this.setData({ showLoginModal: true });`
      }
    ]
  }
];

filesToFix.forEach(({ file, replacements }) => {
  if (!fs.existsSync(file)) {
    console.log(`文件不存在: ${file}`);
    return;
  }

  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  replacements.forEach(({ oldStr, newStr }) => {
    if (content.includes(oldStr)) {
      content = content.replace(oldStr, newStr);
      modified = true;
      console.log(`✓ 修改成功: ${file}`);
    }
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf-8');
  }
});

console.log('\n完成！');
