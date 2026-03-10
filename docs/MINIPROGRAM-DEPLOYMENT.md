# 小程序部署指南

## 环境切换

### 开发环境

在 `miniprogram/utils/config.js` 中设置：

```javascript
const ENV = 'development';
```

**配置**：
- API 地址：`https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api`
- WebSocket：`wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site`
- 调试模式：开启
- Mock 数据：关闭

### 生产环境

在 `miniprogram/utils/config.js` 中设置：

```javascript
const ENV = 'production';
```

**配置**：
- API 地址：`https://yugioh.top/api` 或 `https://api.yugioh.top/api`
- WebSocket：`wss://yugioh.top` 或 `wss://api.yugioh.top`
- 调试模式：关闭
- Mock 数据：关闭

## 部署步骤

### 1. 修改环境配置

```javascript
// miniprogram/utils/config.js
const ENV = 'production'; // 从 'development' 改为 'production'
```

### 2. 选择 API 方案

#### 方案一：使用主域名（需要 CDN 白名单）

```javascript
production: {
  baseUrl: 'https://yugioh.top/api',
  wsUrl: 'wss://yugioh.top',
  // ...
}
```

**前提条件**：
- 已配置 Cloudflare WAF 规则允许小程序请求
- 参考：[CDN 配置指南](./CDN-MINIPROGRAM-SETUP.md)

#### 方案二：使用专用子域名（推荐）

```javascript
production: {
  baseUrl: 'https://api.yugioh.top/api',
  wsUrl: 'wss://api.yugioh.top',
  // ...
}
```

**前提条件**：
- 已创建 `api.yugioh.top` DNS 记录
- 已配置 Nginx/Apache 和 CORS
- 已配置 SSL 证书
- 参考：[部署架构说明](./DEPLOYMENT-ARCHITECTURE.md)

### 3. 更新微信小程序配置

在微信小程序管理后台：

1. **服务器域名配置**
   - request 合法域名：`https://api.yugioh.top` 或 `https://yugioh.top`
   - socket 合法域名：`wss://api.yugioh.top` 或 `wss://yugioh.top`
   - uploadFile 合法域名：同上
   - downloadFile 合法域名：同上

2. **业务域名配置**
   - 添加 `hfb.yugioh.top`（如果有网页功能）

### 4. 代码上传与发布

```bash
# 1. 在微信开发者工具中
# 点击"上传"按钮
# 填写版本号和项目备注

# 2. 登录微信小程序管理后台
# 进入"版本管理" -> "开发版本"
# 点击"提交审核"
# 填写审核信息

# 3. 审核通过后
# 点击"发布"正式上线
```

## 验证清单

### 部署前

- [ ] 已修改 `ENV` 为 `'production'`
- [ ] 已配置正确的 API 地址
- [ ] 已配置微信小程序服务器域名
- [ ] 已测试所有 API 接口
- [ ] 已测试支付功能
- [ ] 已测试 WebSocket 聊天功能
- [ ] 已检查 SSL 证书有效期

### 部署后

- [ ] 账号列表正常加载
- [ ] 用户登录功能正常
- [ ] 微信支付功能正常
- [ ] 钱包充值提现正常
- [ ] 聊天功能正常
- [ ] 实名认证功能正常
- [ ] 所有页面无错误

## 常见问题

### 1. API 请求失败

**原因**：CDN 拦截或 CORS 配置问题

**解决方案**：
- 检查 CDN 白名单配置
- 检查 CORS 配置
- 参考文档：[CDN 配置指南](./CDN-MINIPROGRAM-SETUP.md)

### 2. WebSocket 连接失败

**原因**：域名未配置或证书问题

**解决方案**：
- 检查 WebSocket 域名配置
- 检查 SSL 证书
- 确认 WebSocket 服务器正常运行

### 3. 微信支付失败

**原因**：商户号配置或证书问题

**解决方案**：
- 检查商户号配置
- 检查支付证书
- 检查回调 URL

### 4. 图片上传失败

**原因**：域名未配置或大小超限

**解决方案**：
- 检查 uploadFile 域名配置
- 检查图片大小限制（最大 5MB）
- 检查图片格式（jpg、jpeg、png、webp）

## 回滚方案

如果生产环境出现问题，可以快速回滚：

### 1. 切换回开发环境

```javascript
// miniprogram/utils/config.js
const ENV = 'development';
```

### 2. 重新上传代码

在微信开发者工具中重新上传代码

### 3. 更新为体验版本

在微信小程序管理后台将新版本设为体验版本

## 监控与日志

### 日志收集

在生产环境中，建议：

1. **使用微信小程序后台监控**
   - 查看 API 请求成功率
   - 查看错误日志
   - 查看性能指标

2. **自定义日志上报**
   ```javascript
   // 在 utils/logger.js 中实现
   function logToServer(level, message, data) {
     if (config.env === 'production') {
       request.post('/api/logs', {
         level,
         message,
         data,
         timestamp: Date.now()
       });
     }
   }
   ```

### 性能监控

1. **API 响应时间**
2. **页面加载时间**
3. **用户留存率**
4. **错误率**

## 版本管理

### 版本号规范

采用语义化版本号：`主版本.次版本.修订号`

- `1.0.0`：正式上线版本
- `1.0.1`：Bug 修复
- `1.1.0`：新功能
- `2.0.0`：重大更新

### 发布流程

```
开发版本 → 体验版本 → 审核版本 → 正式版本
    ↓           ↓          ↓          ↓
  测试环境    内部测试    提交审核     发布上线
```

## 安全建议

### 1. 敏感信息保护

- 不要在代码中硬编码 API 密钥
- 使用环境变量或服务端获取
- 微信支付配置从后端获取

### 2. HTTPS 强制

- 所有 API 请求必须使用 HTTPS
- WebSocket 使用 WSS
- 配置 HSTS（可选）

### 3. Token 管理

- Token 存储在本地加密存储
- Token 过期自动刷新
- 退出登录清除 Token

### 4. 数据验证

- 所有用户输入必须验证
- 后端再次验证所有数据
- 防止 SQL 注入、XSS 攻击

## 相关文档

- [部署架构说明](./DEPLOYMENT-ARCHITECTURE.md)
- [CDN 配置指南](./CDN-MINIPROGRAM-SETUP.md)
- [API 文档](./API-DOCUMENTATION.md)

## 技术支持

如有问题，请联系：
- 开发团队：[开发者邮箱]
- 技术支持：[支持邮箱]
- 文档地址：`https://docs.yugioh.top`
