# JSAPI支付申请指南

## 第一步：注册微信支付商户号

### 1.1 准备材料
- 营业执照（企业）
- 法人身份证
- 对公银行账户
- 经营场所照片
- 联系电话

### 1.2 注册流程
1. 访问 [微信支付商户平台](https://pay.weixin.qq.com)
2. 点击"立即接入"
3. 填写企业信息
4. 提交审核（1-3个工作日）
5. 审核通过后获得商户号（mch_id）

## 第二步：关联微信公众号/小程序

### 2.1 方案A：关联公众号
1. 登录微信公众平台
2. 获取 AppID 和 AppSecret
3. 在商户平台关联公众号

### 2.2 方案B：关联小程序（推荐）
1. 登录微信小程序后台
2. 获取 AppID 和 AppSecret
3. 在商户平台关联小程序

**推荐使用小程序**：因为小程序可以同时作为H5应用的授权载体

## 第三步：配置商户号

### 3.1 设置API密钥
1. 登录商户平台
2. 进入「账户中心」→「API安全」
3. 设置API密钥（32位字符串）
4. 保存密钥（重要！）

### 3.2 下载商户证书
1. 进入「账户中心」→「API安全」
2. 点击「申请商户证书」
3. 填写证书信息
4. 下载证书文件：
   - `apiclient_cert.pem`
   - `apiclient_key.pem`

### 3.3 配置支付目录
1. 进入「产品中心」→「开发配置」
2. 添加JSAPI支付授权目录：
   - 域名：`https://yourdomain.com`
   - 支付目录：`https://yourdomain.com/order/`

### 3.4 配置回调地址
1. 进入「产品中心」→「开发配置」
2. 设置支付结果通知URL：
   - 示例：`https://yourdomain.com/api/payment/wechat/notify`

## 第四步：申请特殊权限

### 4.1 申请分账权限
1. 进入「产品中心」→「我的产品」
2. 找到「分账」产品
3. 点击申请开通
4. 填写申请理由
5. 等待审核（1-3个工作日）

### 4.2 申请转账权限
1. 进入「产品中心」→「我的产品」
2. 找到「商家转账到零钱」产品
3. 点击申请开通
4. 填写申请理由
5. 等待审核（1-3个工作日）

**说明**：这两个权限是平台分账和提现功能的必需权限

## 第五步：获取所需信息

### 5.1 商户号信息
- **商户号（mch_id）**：在商户平台首页查看
- **API v3密钥**：在「账户中心」→「API安全」中设置
- **证书序列号（serial_no）**：打开证书文件查看

### 5.2 公众号/小程序信息
- **AppID**：在公众平台/小程序后台查看
- **AppSecret**：在公众平台/小程序后台查看

### 5.3 证书文件
- `apiclient_cert.pem`：商户证书
- `apiclient_key.pem`：商户私钥

## 第六步：开发配置

### 6.1 环境变量配置
```bash
# .env.local
# 微信支付配置
WECHAT_PAY_MCHID=你的商户号
WECHAT_PAY_SERIAL_NO=你的证书序列号
WECHAT_PAY_PRIVATE_KEY=你的商户私钥内容
WECHAT_PAY_APIV3_PRIVATE_KEY=你的API v3密钥
WECHAT_PAY_APPID=你的AppID
WECHAT_PAY_NOTIFY_URL=https://yourdomain.com/api/payment/wechat/notify
```

### 6.2 代码实现
```typescript
// src/lib/wechat-pay.ts
import { Rsa, Formatter } from 'wechatpay-node-v3';

const pay = new Rsa({
  appid: process.env.WECHAT_PAY_APPID!,
  mchid: process.env.WECHAT_PAY_MCHID!,
  private_key: process.env.WECHAT_PAY_PRIVATE_KEY!,
  serial_no: process.env.WECHAT_PAY_SERIAL_NO!,
  apiv3_private_key: process.env.WECHAT_PAY_APIV3_PRIVATE_KEY!,
});

export { pay };
```

### 6.3 创建支付订单
```typescript
// 创建JSAPI支付订单
const params = {
  appid: process.env.WECHAT_PAY_APPID,
  mchid: process.env.WECHAT_PAY_MCHID,
  description: '账号租赁订单',
  out_trade_no: orderNo,  // 商户订单号
  notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
  amount: {
    total: amount * 100,  // 金额（单位：分）
    currency: 'CNY'
  },
  payer: {
    openid: userOpenid  // 用户openid
  }
};

const result = await pay.transactions_jsapi(params);
```

## 第七步：测试

### 7.1 沙箱测试
1. 在商户平台申请沙箱环境
2. 使用沙箱商户号进行测试
3. 测试支付流程

### 7.2 真实环境测试
1. 小额测试（0.01元）
2. 验证支付回调
3. 验证退款流程

## 注意事项

### 安全提醒
- ✅ 不要泄露API密钥和证书
- ✅ 使用HTTPS通信
- ✅ 验证回调签名
- ✅ 不要在前端存储敏感信息

### 审核时间
- 商户号审核：1-3个工作日
- 分账权限审核：1-3个工作日
- 转账权限审核：1-3个工作日

### 常见问题
1. **域名未备案**：必须使用已备案的域名
2. **HTTPS证书**：必须使用有效的HTTPS证书
3. **支付目录**：必须配置正确的支付目录
4. **用户openid**：需要先获取用户openid

## 技术支持
- 微信支付官方文档：https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml
- 开发者社区：https://developers.weixin.qq.com/community/pay
- 技术支持热线：0755-86037988
