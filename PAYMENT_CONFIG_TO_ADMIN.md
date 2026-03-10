# 微信支付配置改为管理后台动态配置

## 📋 更新概述

将微信支付相关的 API 密钥配置从环境变量改为管理后台动态配置，管理员可以在管理后台随时修改支付配置，无需修改环境变量或重启服务器。

## ✅ 已完成的工作

### 1. 数据库表创建

新增 `payment_configs` 表，用于存储支付相关配置：

```sql
CREATE TABLE "payment_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "config_type" varchar(20) NOT NULL,
  "config_key" varchar(50) NOT NULL,
  "config_value" text NOT NULL,
  "is_encrypted" boolean DEFAULT true NOT NULL,
  "description" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "payment_configs_type_key_unique" UNIQUE(config_type, config_key)
);
```

**字段说明**：
- `config_type`: 配置类型（如 wechat、alipay）
- `config_key`: 配置键（如 appid、mch_id、api_key）
- `config_value`: 配置值
- `is_encrypted`: 是否加密存储
- `description`: 配置说明
- `enabled`: 是否启用

### 2. 支付配置数据库访问函数

创建 `src/lib/payment/config.ts`，提供以下函数：

- `getPaymentConfig(configType, configKey)`: 获取单个配置
- `getPaymentConfigsByType(configType)`: 按类型获取所有配置
- `setPaymentConfig(...)`: 设置单个配置
- `deletePaymentConfig(configType, configKey)`: 删除配置
- `batchSetPaymentConfigs(configs)`: 批量设置配置
- `initDefaultPaymentConfigs()`: 初始化默认配置（从环境变量读取）

### 3. 修改微信支付配置读取方式

修改 `src/lib/wechat/config.ts`，将配置读取方式从环境变量改为数据库：

**修改前**：
```typescript
export const wechatPayConfig: WechatPayConfig = {
  appId: process.env.WECHAT_APPID || '',
  mchId: process.env.WECHAT_MCH_ID || '',
  apiKey: process.env.WECHAT_API_KEY || '',
  // ...
};
```

**修改后**：
```typescript
export async function getWechatPayConfig(): Promise<WechatPayConfig> {
  const [appId, mchId, apiKey, ...] = await Promise.all([
    getPaymentConfig('wechat', 'appid'),
    getPaymentConfig('wechat', 'mch_id'),
    getPaymentConfig('wechat', 'api_key'),
    // ...
  ]);

  return {
    appId: appId?.configValue || process.env.WECHAT_APPID || '',
    mchId: mchId?.configValue || process.env.WECHAT_MCH_ID || '',
    apiKey: apiKey?.configValue || process.env.WECHAT_API_KEY || '',
    // ...
  };
}
```

**注意**：保留了环境变量作为后备方案，确保向后兼容。

### 4. 创建管理后台 API 路由

创建 `src/app/api/admin/payment/configs/route.ts`，提供以下接口：

- `GET /api/admin/payment/configs?type=wechat`: 获取支付配置列表
- `PUT /api/admin/payment/configs`: 批量设置支付配置
- `DELETE /api/admin/payment/configs?key=xxx`: 删除支付配置

### 5. 更新管理后台配置页面

更新 `src/app/(dynamic)/admin/payment/wechat/page.tsx`，提供以下功能：

- 显示当前配置状态（完整/不完整）
- 表单编辑支付配置参数
- 保存配置到数据库
- 配置说明和获取指南

### 6. 更新支付相关 API 路由

更新以下 API 路由，使其使用新的配置函数：

- `src/app/api/payment/wechat/config/route.ts`
- `src/app/api/payment/wechat/jsapi/callback/route.ts`
- `src/app/api/payment/wechat/refund/callback/route.ts`
- `src/app/api/wechat/jsapi-signature/route.ts`
- `src/lib/wechat/api.ts`
- `src/lib/wechat/refund.ts`

### 7. 自动初始化支付配置

在 `src/lib/db.ts` 中添加自动初始化函数：

```typescript
export async function ensurePaymentConfigsInitialized() {
  if (!isPaymentConfigsInitialized) {
    await initDefaultPaymentConfigs();
    isPaymentConfigsInitialized = true;
  }
}
```

在应用启动时自动从环境变量初始化支付配置到数据库。

## 🎯 使用方法

### 方法 1：在管理后台配置

1. 登录管理后台
2. 进入"系统设置" → "支付配置" → "微信支付"
3. 填写以下配置项：
   - AppID（必填）
   - 商户号（必填）
   - API 密钥（必填）
   - 回调地址
   - 公众号 AppID
   - 公众号 AppSecret
4. 点击"保存配置"

### 方法 2：使用环境变量初始化

在 `.env.local` 文件中配置以下环境变量：

```env
WECHAT_APPID=wx0831611146088354
WECHAT_MCH_ID=1106605743
WECHAT_API_KEY=your_api_key_here
WECHAT_NOTIFY_URL=https://hfb.yugioh.top/api/payment/wechat/jsapi/callback
WECHAT_MP_APPID=
WECHAT_MP_SECRET=
```

应用启动时会自动从环境变量读取并保存到数据库。

## 🔒 安全特性

### 1. 敏感信息脱敏

API 返回配置时，敏感信息会自动脱敏：

- API 密钥：只显示前 4 位和后 4 位（如 `Abcd***1234`）
- AppID/商户号：只显示前 8 位（如 `wx083161***`）

### 2. 加密存储

- 所有配置默认标记为加密存储（`is_encrypted = true`）
- 实际加密逻辑可根据需要实现

### 3. 密码输入框

- API 密钥字段使用密码输入框
- 提供"显示/隐藏"切换功能

## 📊 配置优先级

配置读取优先级：

1. **数据库配置**（最高优先级）
2. 环境变量**（后备方案）

如果数据库中有配置，则使用数据库配置；否则使用环境变量。

## 🔄 配置更新流程

1. 管理员在管理后台修改配置
2. 调用 `/api/admin/payment/configs` 接口保存到数据库
3. 下次支付请求时自动从数据库读取最新配置
4. **无需重启服务器**

## ✨ 新增功能

### 1. 配置状态检查

提供配置状态检查接口：

```bash
GET /api/payment/wechat/config
```

返回配置是否完整、缺失的配置项等信息。

### 2. 配置检查页面

新增配置检查页面：`/admin/payment/wechat/check`

显示：
- 基础配置状态
- 证书配置状态
- 缺失的配置项
- 快速跳转链接

## 📁 新增/修改的文件

### 新增文件

1. `src/lib/payment/config.ts` - 支付配置数据库访问函数
2. `src/lib/init-payment-configs.ts` - 初始化支付配置脚本
3. `src/app/api/admin/payment/configs/route.ts` - 管理后台支付配置 API
4. `src/app/(dynamic)/admin/payment/wechat/check/page.tsx` - 配置检查页面

### 修改文件

1. `src/storage/database/shared/schema.ts` - 新增 payment_configs 表
2. `src/lib/wechat/config.ts` - 改为从数据库读取配置
3. `src/lib/wechat/api.ts` - 使用新的配置函数
4. `src/lib/wechat/refund.ts` - 使用新的配置函数
5. `src/app/api/payment/wechat/config/route.ts` - 使用异步配置函数
6. `src/app/api/payment/wechat/jsapi/callback/route.ts` - 使用异步配置函数
7. `src/app/api/payment/wechat/refund/callback/route.ts` - 使用异步配置函数
8. `src/app/api/wechat/jsapi-signature/route.ts` - 使用异步配置函数
9. `src/app/(dynamic)/admin/payment/wechat/page.tsx` - 支持动态配置
10. `src/lib/db.ts` - 新增支付配置初始化

## 🧪 测试建议

### 1. 测试配置保存

1. 在管理后台填写支付配置
2. 保存配置
3. 刷新页面，确认配置已保存

### 2. 测试配置读取

1. 调用 `/api/payment/wechat/config` 接口
2. 确认返回的配置状态正确

### 3. 测试支付流程

1. 创建测试订单
2. 发起支付
3. 确认支付成功
4. 检查订单状态是否更新

### 4. 测试配置更新

1. 修改配置（如修改回调地址）
2. 保存配置
3. 发起新支付
4. 确认使用新配置

## ⚠️ 注意事项

### 1. 环境变量保留

虽然改为数据库配置，但环境变量仍保留作为后备方案，确保向后兼容。

### 2. 配置生效时间

- 配置修改后立即生效
- 无需重启服务器
- 建议修改后测试支付功能

### 3. API 密钥安全

- API 密钥仅在管理后台显示脱敏后的值
- 修改 API 密钥需要重新输入完整值
- 建议定期更换 API 密钥

### 4. 数据库备份

- 支付配置存储在数据库中
- 建议定期备份数据库
- 配置丢失会导致支付功能不可用

## 🔗 相关链接

- 管理后台支付配置：`/admin/payment/wechat`
- 配置检查页面：`/admin/payment/wechat/check`
- 配置 API：`/api/admin/payment/configs`
- 配置状态 API：`/api/payment/wechat/config`

## 📚 相关文档

- [微信支付配置指南](./WECHAT_PAYMENT_CONFIG.md)
- [域名配置更新](./DOMAIN_CONFIG_UPDATE.md)

## 🎉 完成情况

- ✅ 数据库表创建
- ✅ 支付配置数据库访问函数
- ✅ 微信支付配置改为从数据库读取
- ✅ 管理后台 API 路由
- ✅ 管理后台配置页面
- ✅ 支付相关 API 路由更新
- ✅ 自动初始化支付配置
- ✅ 敏感信息脱敏
- ✅ 配置状态检查

---

**更新时间**: 2024年
**更新内容**: 将微信支付配置改为管理后台动态配置
