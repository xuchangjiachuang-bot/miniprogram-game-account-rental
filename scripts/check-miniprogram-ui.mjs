import fs from 'node:fs';
import path from 'node:path';

const root = 'C:/Users/11257/Documents/Playground';
const checks = [
  { file: 'miniprogram/app.json', includes: ['"navigationBarTitleText": "账号租赁"', '"text": "首页"', '"text": "订单"', '"text": "消息"', '"text": "我的"'] },
  { file: 'miniprogram/pages/index/index.wxml', includes: ['筛选账号', '哈夫币（M）', '租金（元）', 'publish-text'] },
  { file: 'miniprogram/pages/account/detail/index.wxml', includes: ['账号属性', '皮肤标签', '立即租号'] },
  { file: 'miniprogram/pages/order/detail/index.wxml', includes: ['订单信息', '游戏账号信息', '订单状态'] },
  { file: 'miniprogram/pages/order/payment/index.wxml', includes: ['订单信息', '支付方式', '立即支付'] },
  { file: 'miniprogram/pages/profile/index.wxml', includes: ['个人中心', '完成实名认证后可开启更多交易和提现能力', '去认证'] },
];

const suspiciousFragments = ['鍙', '棣', '璁', '閫', '锟', '???'];
const failures = [];

for (const item of checks) {
  const fullPath = path.join(root, item.file);
  const content = fs.readFileSync(fullPath, 'utf8');

  for (const text of item.includes) {
    if (!content.includes(text)) {
      failures.push(`${item.file} is missing expected text: ${text}`);
    }
  }

  for (const fragment of suspiciousFragments) {
    if (content.includes(fragment)) {
      failures.push(`${item.file} still contains suspicious broken text: ${fragment}`);
      break;
    }
  }

  if (item.file.endsWith('.wxml') && /{{[^}]*\(/.test(content)) {
    failures.push(`${item.file} still contains inline template function calls.`);
  }
}

if (failures.length) {
  console.error('Mini program UI check failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Mini program UI check passed.');

