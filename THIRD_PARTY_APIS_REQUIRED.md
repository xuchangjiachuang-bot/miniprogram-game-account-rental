# 第三方 SDK/API 申请清单

本文档列出了完成哈夫币出租平台所需的所有第三方服务 SDK/API，请按以下清单申请并配置到后台。

---

## 一、支付系统（必需）

### 1.1 微信支付

**申请地址**：https://pay.weixin.qq.com/

**需要申请的权限**：

| 权限/功能 | 用途 | 所需资料 |
|---------|------|---------|
| **JSAPI支付** | 用户在微信内支付 | 营业执照、法人身份证 |
| **Native支付** | 扫码支付 | 同上 |
| **H5支付** | 移动端H5支付 | 同上 |
| **微信分账** | 订单完成后自动分账给卖家 | 申请时需开通分账功能 |
| **商户转账** | 提现时转账到用户账户 | 申请时需开通商户转账功能 |

**需要的配置参数**：

```typescript
{
  appId: "微信开放平台AppID",
  mchId: "微信支付商户号",
  apiKey: "API密钥（32位）",
  apiCertPath: "apiclient_cert.p12文件路径",
  certPath: "apiclient_cert.pem文件路径",
  keyPath: "apiclient_key.pem文件路径",
  notifyUrl: "https://yourdomain.com/api/payments/wechat/notify",
  refundNotifyUrl: "https://yourdomain.com/api/payments/wechat/refund-notify",
  sandbox: false  // 是否使用沙箱环境（测试用）
}
```

**API文档地址**：https://pay.weixin.qq.com/wiki/doc/api/index.html

---

### 1.2 支付宝

**申请地址**：https://open.alipay.com/

**需要申请的权限**：

| 权限/功能 | 用途 | 所需资料 |
|---------|------|---------|
| **电脑网站支付** | PC端支付 | 营业执照、法人身份证 |
| **手机网站支付** | 移动端H5支付 | 同上 |
| **当面付** | 扫码支付 | 同上 |
| **资金分账** | 订单完成后自动分账 | 需单独申请开通 |
| **单笔转账到支付宝账户** | 提现时转账到用户 | 需单独申请开通 |

**需要的配置参数**：

```typescript
{
  appId: "支付宝应用ID",
  privateKey: "应用私钥（PKCS1格式）",
  alipayPublicKey: "支付宝公钥",
  gateway: "https://openapi.alipay.com/gateway.do",  // 正式环境
  // gateway: "https://openapi.alipaydev.com/gateway.do",  // 沙箱环境
  notifyUrl: "https://yourdomain.com/api/payments/alipay/notify",
  return_url: "https://yourdomain.com/orders",
  sandbox: false
}
```

**API文档地址**：https://opendocs.alipay.com/open/270

---

## 二、对象存储（必需）

### 2.1 阿里云 OSS（推荐）

**申请地址**：https://www.aliyun.com/product/oss

**需要的配置参数**：

```typescript
{
  accessKeyId: "AccessKey ID",
  accessKeySecret: "AccessKey Secret",
  bucket: "存储桶名称",
  region: "oss-cn-hangzhou",  // 根据实际区域选择
  endpoint: "https://oss-cn-hangzhou.aliyuncs.com",
  cdnDomain: "https://cdn.yourdomain.com",  // 可选：CDN加速域名
  uploadPath: "uploads/",  // 上传路径前缀
  maxFileSize: 5 * 1024 * 1024,  // 最大文件大小：5MB
  allowedTypes: ["jpg", "jpeg", "png", "gif"]  // 允许的文件类型
}
```

**权限配置**：
- `oss:PutObject`：上传文件
- `oss:GetObject`：下载文件
- `oss:DeleteObject`：删除文件

**SDK安装**：
```bash
pnpm add ali-oss
```

---

### 2.2 腾讯云 COS（备选）

**申请地址**：https://cloud.tencent.com/product/cos

**需要的配置参数**：

```typescript
{
  secretId: "SecretId",
  secretKey: "SecretKey",
  bucket: "存储桶名称",
  region: "ap-guangzhou",
  uploadPath: "uploads/"
}
```

**SDK安装**：
```bash
pnpm add cos-nodejs-sdk-v5
```

---

## 三、身份验证服务（必需）

### 3.1 阿里云实人认证

**申请地址**：https://www.aliyun.com/product/face/body

**需要的配置参数**：

```typescript
{
  accessKeyId: "AccessKey ID",
  accessKeySecret: "AccessKey Secret",
  endpoint: "cloudauth.aliyuncs.com",
  region: "cn-hangzhou",
  sceneId: "实人认证场景ID",
  outerOrderNo: "订单号前缀",
  productCode: "ID_PLUS"
}
```

**权限**：
- `cloudauth:DescribeVerifyToken`：获取认证Token
- `cloudauth:DescribeVerifyResult`：查询认证结果

**SDK安装**：
```bash
pnpm add @alicloud/openapi-client
```

---

### 3.2 百度AI人脸识别（备选）

**申请地址**：https://cloud.baidu.com/product/face

**需要的配置参数**：

```typescript
{
  appId: "应用ID",
  apiKey: "API Key",
  secretKey: "Secret Key",
  endpoint: "https://aip.baidubce.com/rest/2.0/face/v3"
}
```

---

## 四、短信服务（已部分实现，需完整配置）

### 4.1 阿里云短信

**申请地址**：https://www.aliyun.com/product/sms

**需要的配置参数**：

```typescript
{
  accessKeyId: "AccessKey ID",
  accessKeySecret: "AccessKey Secret",
  endpoint: "dysmsapi.aliyuncs.com",
  signName: "短信签名（需审核通过）",
  templateCode: {
    login: "验证码模板CODE",
    register: "注册验证码模板CODE",
    resetPassword: "重置密码模板CODE",
    withdraw: "提现通知模板CODE",
    order: "订单通知模板CODE"
  }
}
```

**需要申请的短信模板**：

| 模板名称 | 模板内容 | 变量 | 用途 |
|---------|---------|------|------|
| 登录验证码 | 您的验证码是${code}，5分钟内有效，请勿泄露给他人。 | code | 用户登录 |
| 注册验证码 | 欢迎注册哈夫币平台，您的验证码是${code}，5分钟内有效。 | code | 新用户注册 |
| 提现通知 | 您已成功提现${amount}元，手续费${fee}元，实际到账${actual}元。 | amount, fee, actual | 提现成功通知 |
| 订单通知 | 您的订单${orderNo}已完成，收入${income}元已到账。 | orderNo, income | 订单完成通知 |

**SDK安装**：
```bash
pnpm add @alicloud/dysmsapi20170525
```

---

## 五、实时通讯（必需）

### 5.1 WebSocket 服务器（自建）

**技术方案**：
- 使用 Node.js + Socket.io 实现实时通讯
- 支持群聊、消息推送、在线状态

**需要的配置**：

```typescript
{
  serverPort: 3001,  // WebSocket服务器端口
  corsOrigin: "https://yourdomain.com",  // 允许的跨域来源
  pingInterval: 25000,  // 心跳间隔
  pingTimeout: 60000,  // 心跳超时
  maxHttpBufferSize: 1e6,  // 最大消息大小
  transports: ["websocket", "polling"]  // 传输方式
}
```

**SDK安装**：
```bash
pnpm add socket.io socket.io-client
```

---

### 5.2 环信 IM（第三方方案，备选）

**申请地址**：https://www.easemob.com/

**需要的配置参数**：

```typescript
{
  orgName: "组织名称",
  appName: "应用名称",
  clientId: "Client ID",
  clientSecret: "Client Secret",
  restApi: "https://a1.easemob.com"
}
```

---

## 六、其他服务（可选）

### 6.1 七牛云 CDN（可选）

**用途**：图片、静态资源加速

**申请地址**：https://www.qiniu.com/

---

### 6.2 微信登录

**申请地址**：https://open.weixin.qq.com/

**需要申请的权限**：

| 权限 | 用途 |
|-----|------|
| **网页授权** | PC端扫码登录 |
| **移动应用** | 移动端微信登录 |

**需要的配置参数**：

```typescript
{
  appId: "微信开放平台AppID",
  appSecret: "AppSecret",
  redirectUri: "https://yourdomain.com/auth/wechat/callback",
  scope: "snsapi_login"
}
```

---

## 七、配置汇总

### 7.1 环境变量配置

将上述配置添加到 `.env.local` 文件：

```bash
# 支付配置
WECHAT_PAY_APP_ID=your_wechat_app_id
WECHAT_PAY_MCH_ID=your_wechat_mch_id
WECHAT_PAY_API_KEY=your_wechat_api_key

ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key
ALIPAY_PUBLIC_KEY=your_alipay_public_key

# 对象存储配置
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=your_bucket_name
OSS_REGION=oss-cn-hangzhou

# 身份验证配置
ALIYUN_ACCESS_KEY_ID=your_aliyun_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_aliyun_access_key_secret
ALIYUN_FACE_SCENE_ID=your_scene_id

# 短信配置
ALIYUN_SMS_ACCESS_KEY_ID=your_sms_access_key_id
ALIYUN_SMS_ACCESS_KEY_SECRET=your_sms_access_key_secret
ALIYUN_SMS_SIGN_NAME=your_sign_name

# 微信登录配置
WECHAT_OA_APP_ID=your_wechat_oa_app_id
WECHAT_OA_APP_SECRET=your_wechat_oa_app_secret
```

---

## 八、开发优先级

### 第一优先级（核心功能）

1. ✅ **对象存储** - 头像、身份证照片上传
2. ✅ **支付宝/微信支付** - 订单支付
3. ✅ **短信服务** - 验证码、通知
4. ✅ **实时通讯** - 群聊功能

### 第二优先级（增强功能）

5. **身份验证服务** - 实名认证
6. **微信登录** - 第三方登录
7. **分账功能** - 自动分账（支付平台）

---

## 九、注意事项

1. **安全性**：
   - 所有密钥和私钥必须保密
   - 不要将密钥提交到 Git 仓库
   - 使用环境变量或加密配置管理

2. **合规性**：
   - 支付分账功能需要向支付平台申请开通
   - 实名认证服务需要符合相关法律法规
   - 短信内容需要审核通过

3. **测试环境**：
   - 支付平台提供沙箱环境，测试时使用沙箱
   - 生产环境上线前必须进行充分测试
   - 保留测试日志，便于问题排查

4. **回调地址**：
   - 支付回调地址必须是公网可访问的HTTPS地址
   - 需要在支付平台后台配置回调URL
   - 确保回调接口处理幂等性

---

## 十、联系支持

如有问题，请联系对应平台的技术支持：

- 微信支付：https://pay.weixin.qq.com/static/applyment_guide/applyment_detail_website.shtml
- 支付宝：https://opendocs.alipay.com/open/270/105899
- 阿里云：https://help.aliyun.com/
- 腾讯云：https://cloud.tencent.com/document/product
