# 🎯 最终修复步骤

## 问题原因

1. ✅ 配置文件正确（`ENV = 'development'`）
2. ❌ **Coze 开发环境 API 超时**
3. ✅ 本地开发环境 API 正常（localhost:5000）

## 解决方案

### 步骤 1：配置已更新 ✅

已将开发环境 API 改为本地地址：
```javascript
development: {
  baseUrl: 'http://localhost:5000/api',
  wsUrl: 'ws://localhost:5000',
  debug: true,
}
```

### 步骤 2：启用"不校验合法域名"（必须）

**在微信开发者工具中**：
1. 点击右上角 **详情** 按钮
2. 找到 **本地设置**
3. 勾选 ✅ **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**
4. 关闭详情窗口

**原因**：使用 localhost 地址必须启用此选项，否则微信会拦截请求。

### 步骤 3：清除缓存

**在微信开发者工具中**：
1. 顶部菜单栏 → **清缓存** → **清除全部缓存**
2. 调试器 → **Storage** → 点击 **Clear** 按钮

### 步骤 4：重新编译

1. 点击 **编译** 按钮
2. **关闭小程序预览**
3. **重新打开小程序**

### 步骤 5：验证

在控制台中应该看到：
```javascript
✅ 加载首页配置成功: { success: true, data: {...} }
✅ 加载账号列表成功: { success: true, data: [...] }
```

在 Network 面板中，请求 URL 应该是：
```
http://localhost:5000/api/homepage-config
http://localhost:5000/api/accounts?page=1&pageSize=10
```

## 如果还是失败

### 检查本地服务是否运行

在终端中执行：
```bash
curl http://localhost:5000/api/homepage-config
```

**预期结果**：返回 JSON 数据，而不是 HTML 页面。

### 检查小程序配置

在控制台中执行：
```javascript
const config = require('../../utils/config.js');
console.log('当前环境:', config.env);
console.log('API 地址:', config.baseUrl);
```

**应该输出**：
```
当前环境: development
API 地址: http://localhost:5000/api
```

### 检查"不校验合法域名"是否启用

1. 点击 **详情** → **本地设置**
2. 确认 **不校验合法域名** 已勾选 ✅

## 完整检查清单

- [ ] 开发环境配置已更新（baseUrl: http://localhost:5000/api）
- [ ] 勾选"不校验合法域名" ✅
- [ ] 清除全部缓存
- [ ] 清除 Storage 缓存
- [ ] 点击编译按钮
- [ ] 关闭并重新打开小程序
- [ ] 检查控制台输出
- [ ] 检查 Network 面板请求 URL

## 成功标志

```javascript
// 控制台输出
✅ 加载首页配置成功
✅ 加载账号列表成功
```

```json
// API 响应
{
  "success": true,
  "data": { ... }
}
```

## 注意事项

⚠️ **"不校验合法域名"仅在开发时使用**

发布到生产环境前：
1. 取消勾选"不校验合法域名"
2. 配置 CDN 白名单（参考 `docs/QUICK-FIX-GUIDE.md`）
3. 修改 `ENV = 'production'`
4. 在微信小程序后台配置服务器域名

## 下一步

当需要切换到生产环境时：
1. 取消勾选"不校验合法域名"
2. 配置 CDN 白名单
3. 修改 `ENV = 'production'`
4. 重新编译发布
