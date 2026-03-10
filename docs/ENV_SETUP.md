# 环境变量配置指南

## 📋 概述

本项目已实现**自动化环境变量配置**，部署时会自动加载环境变量，无需手动在 Coze 平台配置。

## 🚀 快速开始（推荐）

### 方法1：一键设置脚本（最简单）

```bash
# 运行快速设置脚本
bash scripts/setup-env.sh
```

脚本会自动：
1. ✅ 从模板创建 `.env.production` 文件
2. ✅ 预填充所有必需的环境变量
3. ✅ 验证配置是否正确
4. ✅ 提示下一步操作

### 方法2：手动创建

```bash
# 1. 复制模板文件
cp .env.production.example .env.production

# 2. 编辑配置文件
nano .env.production
```

## 📁 文件说明

| 文件 | 说明 | 是否提交到 Git |
|------|------|----------------|
| `.env.production.example` | 环境变量模板文件 | ✅ 是 |
| `.env.production` | 生产环境配置（自动生成） | ❌ 否 |
| `.env.local` | 本地开发配置（可选） | ❌ 否 |
| `.env` | 通用配置（可选） | ❌ 否 |

## 🔧 环境变量优先级

部署时会按照以下优先级加载环境变量：

1. **环境变量**（最高优先级）- Coze 平台配置的环境变量
2. `.env.production` - 生产环境配置文件
3. `.env.local` - 本地开发配置文件
4. `.env` - 通用配置文件

## ✅ 必需的环境变量

以下环境变量必须配置，否则无法正常部署：

```bash
# 微信小程序配置
WECHAT_MINIPROGRAM_APP_ID=wx2382e1949d031ba6
WECHAT_MINIPROGRAM_APP_SECRET=f00d1a872e63be6e72b7ccc63eaa8a2d

# 应用配置
NEXT_PUBLIC_BASE_URL=https://hfb.yugioh.top

# 数据库配置
PGDATABASE_URL=postgresql://user_7602973286103941146:6d1a5e86-6de8-4164-a92d-73b867d5e94a@cp-sharp-tower-5511e9e0.pg4.aidap-global.cn-beijing.volces.com:5432/Database_1770207199429?sslmode=require&channel_binding=require
```

## 🎯 部署流程

### 1. 本地开发

```bash
# 设置环境变量
bash scripts/setup-env.sh

# 启动开发环境
pnpm dev
```

### 2. 构建测试

```bash
# 运行构建脚本（会自动加载环境变量）
bash scripts/build.sh

# 查看构建输出
# ✅ 环境变量验证通过
```

### 3. 提交代码

```bash
# 提交所有文件（.env.production 会自动被 .gitignore 忽略）
git add .
git commit -m "chore: 添加环境变量配置"
git push
```

### 4. 部署到生产环境

在 Coze 平台点击"重新部署"，部署流程如下：

```
1. ✅ 下载代码
2. ✅ 自动加载 .env.production
3. ✅ 验证环境变量
4. ✅ 安装依赖
5. ✅ 构建项目
6. ✅ 启动服务
```

## 🔍 验证环境变量

### 方法1：查看构建日志

在 Coze 平台的部署日志中，你应该看到：

```
🔧 加载环境变量...
✅ 加载 .env.production
🔍 验证环境变量...
✅ 环境变量验证通过
```

### 方法2：查看启动日志

在 Coze 平台的运行日志中，你应该看到：

```
🔧 加载环境变量...
✅ 加载 .env.production
🔍 验证关键环境变量...
✅ WECHAT_MINIPROGRAM_APP_ID 已配置: wx2382e1949d031ba6
✅ WECHAT_MINIPROGRAM_APP_SECRET 已配置
✅ PGDATABASE_URL 已配置
🚀 开始启动服务...
```

### 方法3：测试 API

```bash
# 测试登录 API
curl -X POST https://hfb.yugioh.top/api/auth/miniprogram \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code"}'

# 预期返回：
# {"error":"获取微信授权失败","details":"40029 invalid code"}
```

如果看到这个错误，说明环境变量配置成功！（code=invalid code 是正常的，因为我们用的是测试 code）

## 🛠️ 高级配置

### 添加支付功能

如果需要启用微信支付，需要在 `.env.production` 中添加：

```bash
# 微信支付配置
WECHAT_APPID=wx0831611146088354
WECHAT_MCH_ID=1106605743
WECHAT_API_KEY=your_api_key_here
WECHAT_NOTIFY_URL=https://hfb.yugioh.top/api/payment/wechat/jsapi/callback
```

### 添加短信功能

如果需要启用短信验证码，需要添加：

```bash
# 阿里云短信配置
ALIBABA_CLOUD_ACCESS_KEY_ID=your_access_key_id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_access_key_secret
ALIBABA_CLOUD_SMS_SIGN_NAME=your_sign_name
```

## ⚠️ 安全提醒

1. **不要提交密钥到 Git**
   - `.env.production` 文件已自动添加到 `.gitignore`
   - 不要手动移除或修改 `.gitignore`

2. **定期更换密钥**
   - 建议每 3-6 个月更换一次 AppSecret
   - 在微信小程序后台重新生成密钥

3. **不同环境使用不同密钥**
   - 开发环境和生产环境应该使用不同的配置
   - 使用 `.env.local` 作为开发环境配置

4. **保护配置文件**
   - 确保 `.env.production` 文件权限为 600
   - 不要共享或泄露配置文件

## 🐛 故障排查

### 问题1：构建失败 - "未配置 WECHAT_MINIPROGRAM_APP_ID"

**原因**：`.env.production` 文件不存在或配置不正确

**解决方案**：
```bash
bash scripts/setup-env.sh
```

### 问题2：启动失败 - "环境变量验证失败"

**原因**：必需的环境变量未配置

**解决方案**：
```bash
# 检查配置文件
cat .env.production

# 重新设置
bash scripts/setup-env.sh
```

### 问题3：登录失败 - "小程序SECRET未配置"

**原因**：环境变量未正确加载

**解决方案**：
```bash
# 检查部署日志
# 确认是否有 "✅ 加载 .env.production"

# 如果没有，检查文件是否存在
ls -la .env.production

# 重新部署
```

## 📞 获取帮助

如果遇到问题，请检查：

1. ✅ `.env.production` 文件是否存在
2. ✅ 环境变量是否正确配置
3. ✅ 部署日志是否有错误信息
4. ✅ 微信小程序配置是否正确

## 🎉 总结

通过自动化环境变量配置，你可以：

✅ 一键设置环境变量  
✅ 自动验证配置正确性  
✅ 无需在 Coze 平台手动配置  
✅ 安全地管理敏感信息  
✅ 轻松部署到生产环境  

开始使用：
```bash
bash scripts/setup-env.sh
```
