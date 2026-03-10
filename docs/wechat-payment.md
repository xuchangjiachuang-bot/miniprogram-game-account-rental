# 微信 JSAPI 支付集成文档

## 概述

本文档介绍如何在项目中集成微信 JSAPI 支付功能。

## 架构说明

### 支付流程

1. 用户在订单详情页点击"去支付"
2. 前端调用 `POST /api/payment/wechat/jsapi/create` 创建支付订单
3. 后端调用微信统一下单接口，获取 `prepay_id`
4. 后端生成签名，返回支付参数给前端
5. 前端调用 `wx.chooseWXPay` 发起支付
6. 用户在微信中完成支付
7. 微信回调后端接口 `POST /api/payment/wechat/jsapi/callback`
8. 后端更新订单状态为"已支付"
9. 前端轮询订单状态或接收通知

## 配置说明

### 1. 环境变量配置

在 `.env.local` 文件中添加以下配置：

```env
# 微信支付配置
WECHAT_APPID=your_wechat_appid
WECHAT_MCH_ID=your_wechat_mch_id
WECHAT_API_KEY=your_wechat_api_key
WECHAT_NOTIFY_URL=https://yugioh.top/api/payment/wechat/jsapi/callback
```

### 2. 获取配置信息

#### 2.1 申请微信支付

1. 访问 [微信支付商户平台](https://pay.weixin.qq.com)
2. 提交营业执照、法人身份证等资料申请微信支付
3. 等待审核通过（通常 1-3 个工作日）

#### 2.2 获取配置信息

审核通过后，在微信商户平台获取以下信息：

- **AppID**：在"账户中心"->"个人信息"中查看
- **商户号**：在"账户中心"->"商户信息"中查看
- **API 密钥**：
  1. 进入"账户中心"->"API安全"
  2. 点击"设置 API 密钥"
  3. 设置一个 32 位的字符串作为密钥（妥善保管）

#### 2.3 配置支付授权目录

1. 进入"产品中心"->"开发配置"
2. 找到"JSAPI 支付"
3. 设置支付授权目录：`https://yugioh.top/`
4. 点击保存

#### 2.4 配置回调域名

1. 进入"产品中心"->"开发配置"
2. 找到"支付结果通知"
3. 设置回调域名：`yugioh.top`
4. 点击保存

## API 接口说明

### 1. 创建支付订单

**接口**：`POST /api/payment/wechat/jsapi/create`

**请求参数**：

```json
{
  "orderId": "订单ID",
  "openid": "用户 openid"
}
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "appId": "wx083161...",
    "timeStamp": "1641234567",
    "nonceStr": "随机字符串",
    "package": "prepay_id=...",
    "signType": "MD5",
    "paySign": "支付签名",
    "orderId": "订单ID",
    "totalPrice": 100.00
  }
}
```

### 2. 支付回调

**接口**：`POST /api/payment/wechat/jsapi/callback`

**说明**：此接口由微信服务器调用，无需前端直接调用。

**回调数据示例**：

```xml
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <return_msg><![CDATA[OK]]></return_msg>
  <appid><![CDATA[wx083161...]]></appid>
  <mch_id><![CDATA[商户号]]></mch_id>
  <nonce_str><![CDATA[随机字符串]]></nonce_str>
  <sign><![CDATA[签名]]></sign>
  <result_code><![CDATA[SUCCESS]]></result_code>
  <openid><![CDATA[用户 openid]]></openid>
  <trade_type><![CDATA[JSAPI]]></trade_type>
  <bank_type><![CDATA[CFT]]></bank_type>
  <total_fee>10000</total_fee>
  <transaction_id><![CDATA[微信交易号]]></transaction_id>
  <out_trade_no><![CDATA[订单号]]></out_trade_no>
  <time_end><![CDATA[20240114120000]]></time_end>
</xml>
```

### 3. 配置检查

**接口**：`GET /api/payment/wechat/config`

**响应示例**：

```json
{
  "success": true,
  "data": {
    "configured": false,
    "missing": ["WECHAT_MCH_ID", "WECHAT_API_KEY"],
    "appId": "wx083161***",
    "mchId": "未配置",
    "notifyUrl": "https://yugioh.top/api/payment/wechat/jsapi/callback"
  }
}
```

## 前端集成

### 1. 加载微信 JS-SDK

```tsx
import { useWechatJSAPI } from '@/hooks/useWechatJSAPI';

function PaymentPage() {
  const { loaded, error } = useWechatJSAPI();

  if (error) {
    return <div>{error}</div>;
  }

  if (!loaded) {
    return <div>加载中...</div>;
  }

  // 使用 window.wx 调用支付
}
```

### 2. 发起支付

```tsx
const handlePayment = async () => {
  // 1. 创建支付订单
  const createResponse = await fetch('/api/payment/wechat/jsapi/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId: '订单ID',
      openid: '用户 openid',
    }),
  });

  const createResult = await createResponse.json();

  if (!createResult.success) {
    alert('创建支付失败');
    return;
  }

  const paymentParams = createResult.data;

  // 2. 调用微信支付
  window.wx.chooseWXPay({
    timestamp: paymentParams.timeStamp,
    nonceStr: paymentParams.nonceStr,
    package: paymentParams.package,
    signType: paymentParams.signType,
    paySign: paymentParams.paySign,
    success: () => {
      console.log('支付成功');
    },
    fail: (err) => {
      console.error('支付失败:', err);
    },
  });
};
```

## 测试说明

### 1. 沙箱环境

微信支付提供沙箱环境用于测试，无需真实资金。

**沙箱环境配置**：

1. 登录微信支付商户平台
2. 进入"产品中心"->"沙箱"
3. 开启沙箱环境
4. 获取沙箱环境的相关配置

### 2. 测试流程

1. 创建一个测试订单
2. 使用沙箱环境的 AppID 和商户号
3. 在微信开发者工具中打开支付页面
4. 调用支付接口
5. 在微信开发者工具中完成支付
6. 检查订单状态是否更新

## 常见问题

### 1. 签名错误

**原因**：
- API 密钥配置错误
- 参数顺序不正确
- 字符编码问题

**解决方法**：
- 检查 API 密钥是否正确
- 确保参数按字典序排序
- 确保使用 UTF-8 编码

### 2. 回调地址未配置

**原因**：
- 未在微信商户平台配置回调域名
- 回调地址格式不正确

**解决方法**：
- 在微信商户平台配置回调域名
- 确保回调地址格式正确（不含端口号）

### 3. 支付授权目录未配置

**原因**：
- 未在微信商户平台配置支付授权目录
- 授权目录格式不正确

**解决方法**：
- 在微信商户平台配置支付授权目录
- 确保授权目录格式正确（以 `/` 结尾）

### 4. OpenID 获取失败

**原因**：
- 未通过微信 OAuth 获取用户授权
- 微信公众号配置不正确

**解决方法**：
- 实现微信 OAuth 登录流程
- 检查微信公众号配置

## 安全建议

1. **妥善保管 API 密钥**：不要将 API 密钥提交到版本控制系统
2. **使用 HTTPS**：确保所有接口都使用 HTTPS
3. **验证签名**：始终验证回调数据的签名
4. **金额验证**：回调时验证支付金额是否正确
5. **幂等性处理**：确保订单状态更新具有幂等性

## 后续优化

1. **实现微信 OAuth**：实现微信 OAuth 登录流程，获取用户 OpenID
2. **订单状态轮询**：使用 WebSocket 或 SSE 替代轮询
3. **退款功能**：实现退款功能
4. **对账功能**：实现微信支付对账功能
5. **沙箱环境支持**：支持切换沙箱环境和生产环境

## 联系支持

如有问题，请联系：
- 邮箱：support@yugioh.top
- 微信支付客服：95017
