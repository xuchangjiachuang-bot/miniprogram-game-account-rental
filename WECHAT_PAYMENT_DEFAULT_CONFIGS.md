# 微信支付默认配置说明

## 问题说明

管理后台微信支付配置页面显示的默认值与数据库中实际存储的配置不一致。

## 实际配置状态

### 数据库中的配置（已保存）

从数据库加载的配置如下：

| 配置项 | 值 | 说明 |
|--------|------|------|
| appid | wx083161*** | 微信应用 ID（已隐藏） |
| mch_id | 110660*** | 微信商户号（已隐藏） |
| api_key | your***here | API 密钥（占位符，需要修改） |
| notify_url | https://hfb.yugioh.top/api/payment/wechat/jsapi/callback | 支付回调地址 |
| mp_appid | wx083161*** | 公众号 AppID（已隐藏） |
| mp_secret | 59dd***3527 | 公众号 AppSecret（已隐藏） |
| cert_path | certs/wechat/apiclient_cert.p12 | 证书路径 |
| key_path | certs/wechat/apiclient_key.pem | 密钥路径 |
| cert_p12_password | 1106605743 | 证书密码 |
| cert_serial_no | 15FCE18FC26A4A9530CDADDC5FC2FDB10499F06B | 证书序列号 |

### 环境变量中的配置

`.env.local` 文件中的配置：

```env
WECHAT_APPID=wx0831611146088354
WECHAT_MCH_ID=1106605743
WECHAT_API_KEY=your_api_key_here
WECHAT_NOTIFY_URL=https://hfb.yugioh.top/api/payment/wechat/jsapi/callback
WECHAT_MP_APPID=wx0831611146088354
WECHAT_MP_SECRET=59dddd04e2a748379f32b73f88e63527
WECHAT_CERT_P12_PASSWORD=your_cert_password_here
```

### 初始化默认值

`src/lib/payment/config.ts` 中的 `initDefaultPaymentConfigs` 函数定义的默认值：

```typescript
{
  configType: 'wechat',
  configKey: 'appid',
  configValue: process.env.WECHAT_APPID || '',  // wx0831611146088354
  description: '微信应用ID',
},
{
  configType: 'wechat',
  configKey: 'mch_id',
  configValue: process.env.WECHAT_MCH_ID || '',  // 1106605743
  description: '微信商户号',
},
{
  configType: 'wechat',
  configKey: 'api_key',
  configValue: process.env.WECHAT_API_KEY || '',  // your_api_key_here
  description: '微信支付API密钥',
},
{
  configType: 'wechat',
  configKey: 'notify_url',
  configValue: process.env.WECHAT_NOTIFY_URL || 'https://hfb.yugioh.top/api/payment/wechat/jsapi/callback',
  description: '支付回调地址',
},
{
  configType: 'wechat',
  configKey: 'mp_appid',
  configValue: process.env.WECHAT_MP_APPID || '',  // wx0831611146088354
  description: '公众号AppID',
},
{
  configType: 'wechat',
  configKey: 'mp_secret',
  configValue: process.env.WECHAT_MP_SECRET || '',  // 59dddd04e2a748379f32b73f88e63527
  description: '公众号AppSecret',
},
{
  configType: 'wechat',
  configKey: 'cert_path',
  configValue: 'certs/wechat/apiclient_cert.p12',  // 硬编码默认值
  description: '证书路径',
},
{
  configType: 'wechat',
  configKey: 'key_path',
  configValue: 'certs/wechat/apiclient_key.pem',  // 硬编码默认值
  description: '密钥路径',
},
{
  configType: 'wechat',
  configKey: 'cert_p12_password',
  configValue: process.env.WECHAT_CERT_P12_PASSWORD || '1106605743',  // 环境变量或默认值
  description: '证书密码',
},
{
  configType: 'wechat',
  configKey: 'cert_serial_no',
  configValue: '15FCE18FC26A4A9530CDADDC5FC2FDB10499F06B',  // 硬编码默认值
  description: '证书序列号',
},
```

## 配置优先级

1. **数据库配置**（最高优先级）- 已保存的配置
2. **环境变量** - 从 `.env.local` 读取
3. **硬编码默认值** - 代码中定义的默认值

## 当前配置差异说明

### 证书配置

| 配置项 | 数据库值 | 硬编码默认值 | 说明 |
|--------|---------|-------------|------|
| cert_path | `certs/wechat/apiclient_cert.p12` | `certs/wechat/apiclient_cert.p12` | ✅ 一致 |
| key_path | `certs/wechat/apiclient_key.pem` | `certs/wechat/apiclient_key.pem` | ✅ 一致 |
| cert_p12_password | `1106605743` | `1106605743` | ✅ 一致 |
| cert_serial_no | `15FCE18FC26A4A9530CDADDC5FC2FDB10499F06B` | `15FCE18FC26A4A9530CDADDC5FC2FDB10499F06B` | ✅ 一致 |

### 基础配置

| 配置项 | 数据库值 | 环境变量 | 说明 |
|--------|---------|---------|------|
| appid | `wx083161***` | `wx0831611146088354` | ✅ 一致（显示时隐藏） |
| mch_id | `110660***` | `1106605743` | ✅ 一致（显示时隐藏） |
| api_key | `your***here` | `your_api_key_here` | ⚠️ 占位符，需要修改 |
| notify_url | `https://hfb.yugioh.top/api/payment/wechat/jsapi/callback` | `https://hfb.yugioh.top/api/payment/wechat/jsapi/callback` | ✅ 一致 |
| mp_appid | `wx083161***` | `wx0831611146088354` | ✅ 一致（显示时隐藏） |
| mp_secret | `59dd***3527` | `59dddd04e2a748379f32b73f88e63527` | ✅ 一致（显示时隐藏） |

## 需要修改的配置

### ⚠️ API 密钥（必须修改）

当前值为占位符 `your_api_key_here`，需要修改为实际的 API 密钥：

1. 登录微信支付商户平台
2. 进入"账户中心" → "API安全"
3. 设置或查看 API 密钥（32 位，仅字母和数字）
4. 在管理后台 `/admin/payment/wechat` 页面填写实际的 API 密钥
5. 点击"保存配置"

### ✅ 其他配置

其他配置项已经是正确的值：
- AppID: `wx0831611146088354`
- 商户号: `1106605743`
- 回调地址: `https://hfb.yugioh.top/api/payment/wechat/jsapi/callback`
- 公众号 AppID: `wx0831611146088354`
- 公众号 AppSecret: `59dddd04e2a748379f32b73f88e63527`
- 证书路径: `certs/wechat/apiclient_cert.p12`
- 密钥路径: `certs/wechat/apiclient_key.pem`
- 证书密码: `1106605743`
- 证书序列号: `15FCE18FC26A4A9530CDADDC5FC2FDB10499F06B`

## 自动初始化逻辑

为了避免配置不一致的问题，前端页面已经添加了自动初始化逻辑：

1. **加载配置时检测**：检查数据库中是否缺少证书配置
2. **自动初始化**：如果缺少证书配置，自动调用 API 初始化
3. **重新加载配置**：初始化完成后重新加载配置，确保显示最新的配置

这样即使数据库中缺少证书配置，用户访问页面时也会自动初始化，不会出现配置不一致的问题。

## 配置完整性检查

通过以下命令检查当前配置状态：

```bash
curl http://localhost:5000/api/admin/payment/configs?type=wechat
```

预期应该返回 10 个配置项：
- appid
- mch_id
- api_key
- notify_url
- mp_appid
- mp_secret
- cert_path
- key_path
- cert_p12_password
- cert_serial_no

## 总结

### ✅ 配置已初始化

所有 10 个配置项都已初始化到数据库中，包括：
- 6 个基础配置
- 4 个证书配置

### ⚠️ 需要手动修改

只有 `api_key` 需要手动修改为实际的 API 密钥。

### 🎯 配置一致性

当前数据库配置与硬编码默认值完全一致，没有发现不一致的情况。

---

**更新日期**：2026-02-24
**配置版本**：v1.1.0
