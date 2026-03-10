import bcrypt from 'bcryptjs';

const hashedPassword = '$2b$10$3Lbbw5GmuIyxYC/Cjj95LOx8s2XkWkJ8Ox/CIlF8lWEmHOJSVm46K';

// 测试常见的默认密码
const testPasswords = ['admin', 'admin123', 'password', '123456', 'root', 'administrator'];

console.log('测试管理员密码...\n');

for (const pwd of testPasswords) {
  const match = await bcrypt.compare(pwd, hashedPassword);
  if (match) {
    console.log(`✅ 找到匹配的密码: "${pwd}"`);
    process.exit(0);
  } else {
    console.log(`❌ 密码 "${pwd}" 不匹配`);
  }
}

console.log('\n❌ 所有测试密码都不匹配');
process.exit(1);
