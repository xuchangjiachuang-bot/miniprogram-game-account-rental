import fs from 'node:fs';
import path from 'node:path';

const root = 'C:/Users/11257/Documents/Playground';
const checks = [
  { file: 'miniprogram/app.json', includes: ['"navigationBarTitleText": "账号租赁"', '"text": "首页"', '"text": "订单"', '"text": "消息"', '"text": "我的"'] },
  { file: 'miniprogram/pages/index/index.wxml', includes: ['筛选账号', '哈夫币（M）', '租金（元）', '发布账号'] },
  { file: 'miniprogram/pages/order/list/index.wxml', includes: ['订单号', '租金', '暂无订单'] },
  { file: 'miniprogram/pages/order/detail/index.wxml', includes: ['订单信息', '游戏账号信息', '订单状态'] },
  { file: 'miniprogram/pages/order/detail/index.js', includes: ['费用明细', '再次租号', '确认归还'] },
  { file: 'miniprogram/pages/order/detail/index.json', includes: ['订单详情'] },
  { file: 'miniprogram/pages/order/payment/index.wxml', includes: ['订单信息', '支付方式', '立即支付'] },
  { file: 'miniprogram/pages/order/payment/index.json', includes: ['订单支付'] },
  { file: 'miniprogram/pages/account/detail/index.wxml', includes: ['账号属性', '皮肤标签', '立即租号'] },
  { file: 'miniprogram/pages/account/publish/index.wxml', includes: ['租期自定义选项', '建议选择更快租期的同时，提高出租比例，请根据自己需求合理设置。'] },
  { file: 'miniprogram/pages/auth/login/index.wxml', includes: ['微信快捷登录', '用户协议', '隐私政策'] },
  { file: 'miniprogram/pages/auth/bind-phone/index.wxml', includes: ['绑定手机号', '确认绑定'] },
  { file: 'miniprogram/pages/auth/wechat-login/index.wxml', includes: ['微信授权登录', '微信快捷登录', '暂不登录，先返回'] },
  { file: 'miniprogram/pages/auth/wechat-login/index.json', includes: ['微信授权登录'] },
  { file: 'miniprogram/pages/profile/edit/index.wxml', includes: ['编辑资料', '点击更换头像', '保存资料'] },
  { file: 'miniprogram/pages/profile/edit/index.json', includes: ['编辑资料'] },
  { file: 'miniprogram/pages/wallet/index.wxml', includes: ['可用余额', '收支统计', '月度账单'] },
  { file: 'miniprogram/pages/wallet/bill/index.wxml', includes: ['账单月份', '分类统计', '交易明细'] },
  { file: 'miniprogram/pages/wallet/bill/index.json', includes: ['月度账单'] },
  { file: 'miniprogram/pages/wallet/recharge/index.wxml', includes: ['选择充值金额', '微信支付', '立即充值'] },
  { file: 'miniprogram/pages/wallet/withdraw/index.wxml', includes: ['可提现余额', '提现账户', '确认提现'] },
  { file: 'miniprogram/pages/wallet/withdraw-detail/index.wxml', includes: ['提现详情', '处理进度', '刷新状态'] },
  { file: 'miniprogram/pages/wallet/withdraw-detail/index.json', includes: ['提现详情'] },
  { file: 'miniprogram/pages/order/payment/wechat/index.wxml', includes: ['微信支付', '费用明细', '立即支付'] },
  { file: 'miniprogram/pages/order/payment/wechat/index.json', includes: ['微信支付'] },
  { file: 'miniprogram/pages/chat/list/index.wxml', includes: ['搜索聊天', '暂无聊天'] },
  { file: 'miniprogram/pages/chat/detail/index.wxml', includes: ['输入消息...', '发送'] },
  { file: 'miniprogram/pages/profile/index.wxml', includes: ['个人中心', '完成实名认证后可开启更多交易和提现能力', '去认证'] },
  { file: 'miniprogram/pages/profile/index.js', includes: ['我的订单', '退出登录', '我的钱包'] },
  { file: 'miniprogram/components/login-modal/index.wxml', includes: ['微信快捷登录', '登录后继续操作', '使用微信授权登录'] },
];

const brokenFragments = ['鍏', '鈥', '馃', '???', '????', '����'];
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

  if (item.file.endsWith('.wxml') && /{{[^}]*\(/.test(content)) {
    failures.push(item.file + ' still contains inline template function calls.');
  }
}

if (failures.length) {
  console.error('Mini program UI check failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Mini program UI check passed.');
