import fs from 'node:fs';
import path from 'node:path';

const root = 'C:/Users/11257/Documents/Playground';
const checks = [
  {
    file: 'miniprogram/pages/wallet/index.wxml',
    includes: ['可用余额', '收支统计', '月度账单'],
  },
  {
    file: 'miniprogram/pages/wallet/recharge/index.wxml',
    includes: ['选择充值金额', '微信支付', '立即充值'],
  },
  {
    file: 'miniprogram/pages/wallet/withdraw/index.wxml',
    includes: ['可提现余额', '提现账户', '确认提现'],
  },
  {
    file: 'miniprogram/pages/chat/list/index.wxml',
    includes: ['搜索聊天', '暂无聊天'],
  },
  {
    file: 'miniprogram/pages/chat/detail/index.wxml',
    includes: ['输入消息...', '发送'],
  },
  {
    file: 'miniprogram/pages/account/publish/index.wxml',
    includes: ['租期自定义选项', '建议选择更快租期的同时，提高出租比例，请根据自己需求合理设置。'],
  },
];

const brokenFragments = ['鍏', '寰俊', '鈥', '馃', '??', '鏈湀', '鍙戝竷'];
const failures = [];

for (const item of checks) {
  const fullPath = path.join(root, item.file);
  const content = fs.readFileSync(fullPath, 'utf8');

  item.includes.forEach((text) => {
    if (!content.includes(text)) {
      failures.push(item.file + ' is missing expected text: ' + text);
    }
  });

  brokenFragments.forEach((fragment) => {
    if (content.includes(fragment)) {
      failures.push(item.file + ' still contains suspicious broken text: ' + fragment);
    }
  });

  const brokenClosingTag = content.match(/<\/[^>\s]+$/m);
  if (brokenClosingTag) {
    failures.push(item.file + ' contains a malformed closing tag.');
  }
}

if (failures.length) {
  console.error('Mini program UI check failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Mini program UI check passed.');
