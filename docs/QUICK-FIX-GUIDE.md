# 🚨 CDN 拦截问题快速修复指南

## 问题确认

你的小程序正在访问生产环境 API（`yugioh.top/api`），被 CDN 使用 FingerprintJS 指纹验证拦截，返回 HTML 页面而非 JSON 数据。

**错误特征**：
```json
{
  "error": "请求失败",
  "data": "<html>...FingerprintJS 脚本...</html>"
}
```

## 📋 快速修复方案

### 方案一：临时使用开发环境 API（5 分钟）

**步骤 1：修改小程序配置**

打开 `miniprogram/utils/config.js`，确保环境设置为开发模式：

```javascript
// 确保第一行是这样的
const ENV = 'development';
```

**步骤 2：清除缓存并重新编译**

在微信开发者工具中：
1. 点击右上角"清缓存" → "清除全部缓存"
2. 点击"编译"重新构建小程序
3. 关闭并重新打开小程序

**步骤 3：验证**

检查小程序是否能正常加载：
- ✅ 首页配置加载成功
- ✅ 账号列表显示正常
- ✅ 所有 API 请求返回 JSON 数据

**工作原理**：
```
开发环境 API：https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api
    ↓
Coze 内部网络（没有 CDN 验证）
    ↓
✅ 正常返回 JSON 数据
```

### 方案二：配置 CDN 白名单（10 分钟，推荐）

如果你需要使用生产环境，配置 CDN 白名单：

#### 1. 登录 Cloudflare Dashboard

访问：https://dash.cloudflare.com

#### 2. 选择域名

选择你的域名：`yugioh.top`

#### 3. 创建 WAF 规则

进入：**Security** → **WAF** → **Custom rules** → **Create rule**

**规则配置**：
```
规则名称：Allow Miniprogram API Requests

条件（When incoming requests match）：
- URI Path contains /api
- AND
- Header x-client-type contains miniprogram

然后（Then）：
- Allow
```

**完整规则表达式**：
```
(http.request.uri.path contains "/api") and (http.request.headers["x-client-type"][0] contains "miniprogram")
```

点击 **Deploy** 部署规则。

#### 4. 跳过 Bot Protection

进入：**Security** → **Bot Management** → **Configure**

**创建跳过规则**：
```
规则名称：Skip Bot Protection for Miniprogram

条件：
- Path: /api/*
- Header: X-Client-Type = miniprogram

动作：
- Skip Bot Management
```

#### 5. 验证规则

打开终端，测试 API：

```bash
curl -H "X-Client-Type: miniprogram" \
     https://yugioh.top/api/accounts?limit=1
```

**预期结果**：返回 JSON 格式的账号列表，而不是 HTML 页面。

#### 6. 更新小程序配置

修改 `miniprogram/utils/config.js`：

```javascript
const ENV = 'production';
```

重新编译小程序。

### 方案三：检查小程序缓存问题

如果配置已经是 `development` 但仍然报错：

#### 1. 清除微信开发者工具缓存

```
菜单栏 → 清缓存 → 清除全部缓存
```

#### 2. 清除小程序缓存

```
微信开发者工具 → 调试器 → Storage
点击 "Clear" 按钮清除所有存储
```

#### 3. 强制刷新

```
点击 "编译" 按钮重新编译
关闭小程序重新打开
```

#### 4. 检查是否有硬编码的 API 地址

搜索小程序代码中是否有硬编码的 API 地址：

```javascript
// 搜索这些字符串
- 'https://yugioh.top/api'
- 'yugioh.top'
```

如果有，修改为使用配置文件：

```javascript
// 错误 ❌
const url = 'https://yugioh.top/api/accounts';

// 正确 ✅
const url = config.baseUrl + '/accounts';
```

## 🔍 诊断问题

### 检查当前配置

在微信开发者工具的控制台中执行：

```javascript
const config = require('../../utils/config.js');
console.log('当前环境:', config.env);
console.log('API 地址:', config.baseUrl);
console.log('WebSocket 地址:', config.wsUrl);
```

**预期输出**：
```
当前环境: development
API 地址: https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api
WebSocket 地址: wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

### 检查网络请求

在微信开发者工具的 Network 面板中：
1. 找到失败的请求
2. 查看 Request URL
3. 如果是 `https://yugioh.top/api`，说明使用了生产环境配置
4. 如果是 `https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api`，说明使用了开发环境配置

## 📊 问题原因分析

### 开发环境正常，生产环境失败的原因

| 环境 | 域名 | CDN | 状态 |
|------|------|-----|------|
| 开发环境 | `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site` | 无 | ✅ 正常 |
| 生产环境 | `yugioh.top` | Cloudflare | ❌ 被拦截 |

**为什么开发环境正常**：
- Coze 开发环境使用内部网络
- 没有 CDN 验证层
- 直接访问 API 服务器

**为什么生产环境失败**：
- `yugioh.top` 使用 Cloudflare CDN
- 启用了 FingerprintJS 浏览器指纹验证
- 小程序无法执行 JavaScript 完成验证
- CDN 返回 HTML 验证页面

## 🎯 推荐方案优先级

### 优先级 1：临时使用开发环境（立即）
- ⏱️ 时间：5 分钟
- 🔒 限制：仅用于开发测试
- ✅ 优点：立即可用

### 优先级 2：配置 CDN 白名单（短期）
- ⏱️ 时间：10 分钟
- 🎯 适用：需要使用生产环境
- ✅ 优点：永久解决

### 优先级 3：创建 API 子域名（长期）
- ⏱️ 时间：1 天（含审核）
- 🎯 适用：正式上线
- ✅ 优点：最稳定

## 📞 联系支持

如果以上方案都无法解决：

1. **检查 Cloudflare 配置**
   - 确认 WAF 规则已部署
   - 确认 Bot Protection 已跳过
   - 检查是否有其他安全规则拦截

2. **联系服务器管理员**
   - 说明需要配置 CDN 白名单
   - 提供具体规则配置

3. **检查服务器日志**
   ```bash
   tail -n 50 /app/work/logs/bypass/app.log
   ```

## 📝 检查清单

使用此清单逐步排查问题：

- [ ] 确认 `miniprogram/utils/config.js` 中 `ENV = 'development'`
- [ ] 清除微信开发者工具缓存
- [ ] 清除小程序 Storage 缓存
- [ ] 重新编译小程序
- [ ] 检查 Network 面板中的请求 URL
- [ ] 在控制台中检查 `config.baseUrl` 的值
- [ ] 搜索代码中是否有硬编码的 API 地址
- [ ] 如果需要生产环境，配置 CDN 白名单

## ✅ 成功标志

当问题解决后，你应该看到：

```javascript
// 控制台输出
✅ 加载首页配置成功: { success: true, data: {...} }
✅ 加载账号列表成功: { success: true, data: [...] }
```

```json
// API 响应
{
  "success": true,
  "data": {
    // 正常的 JSON 数据，不是 HTML
  }
}
```

## 相关文档

- [为什么频繁更换域名不能解决问题](./WHY-DOMAIN-CHANGE-WONT-WORK.md)
- [CDN 配置指南](./CDN-MINIPROGRAM-SETUP.md)
- [部署架构说明](./DEPLOYMENT-ARCHITECTURE.md)
