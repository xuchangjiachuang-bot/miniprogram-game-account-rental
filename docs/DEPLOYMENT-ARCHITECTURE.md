# 项目部署架构说明

## 环境信息

### 开发环境
- **访问地址**: `https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/`
- **用途**: 本地开发和测试
- **特点**: 自动部署、实时预览

### 生产环境
- **访问地址**: `hfb.yugioh.top`
- **用途**: 正式上线的小程序
- **特点**: 稳定、高性能

## 架构说明

### 域名结构
```
yugioh.top (主域名)
├── hfb.yugioh.top          # 小程序前端
├── admin.yugioh.top        # 管理后台（可选）
└── /api/*                  # API 服务路径
```

### 当前配置

#### 小程序端（`miniprogram/utils/config.js`）
```javascript
const config = {
  // API 基础地址
  baseUrl: 'https://yugioh.top/api',

  // WebSocket 地址
  wsUrl: 'wss://yugioh.top',
  // ...
};
```

#### 问题分析

**当前架构**：
- 前端域名：`hfb.yugioh.top`（小程序）
- API 域名：`yugioh.top`
- 两者使用**同一个主域名**，但使用不同的子域名

**问题所在**：
1. `yugioh.top` 域名配置了 CDN/防护服务（如 Cloudflare）
2. 小程序访问 `https://yugioh.top/api` 时被 CDN 拦截
3. CDN 要求完成浏览器指纹验证，但小程序无法执行 JavaScript

## 解决方案

### 方案一：配置 CDN 白名单（推荐）

#### Cloudflare WAF 规则

1. **允许小程序 API 请求**
   ```
   规则名称：Allow HFB Miniprogram API
   条件：
     - (http.request.uri.path contains "/api")
     - AND (
       - (http.request.headers["x-client-type"] contains "miniprogram")
       - OR (http.request.headers["origin"] contains "hfb.yugioh.top")
     )
   动作：Allow
   ```

2. **跳过 Bot Protection**
   ```
   路径：/api/*
   Header：X-Client-Type: miniprogram
   动作：Skip Bot Protection
   ```

3. **配置 CORS（如果需要）**
   ```
   来源域名：hfb.yugioh.top
   允许的方法：GET, POST, PUT, DELETE, OPTIONS
   允许的 Header：Content-Type, Authorization, X-Client-Type
   ```

### 方案二：使用专用 API 子域名

#### 架构调整
```
yugioh.top (主域名)
├── hfb.yugioh.top          # 小程序前端
├── api.yugioh.top          # API 服务（新）
└── admin.yugioh.top        # 管理后台
```

#### 实施步骤

1. **添加 DNS 记录**
   ```
   api.yugioh.top A [服务器IP]
   ```
   - 使用灰色云朵（不经过 CDN 代理）

2. **修改 Nginx/Apache 配置**
   ```nginx
   server {
       listen 443 ssl;
       server_name api.yugioh.top;

       # SSL 证书
       ssl_certificate /path/to/api.yugioh.top.crt;
       ssl_certificate_key /path/to/api.yugioh.top.key;

       location / {
           # 添加 CORS 头
           add_header 'Access-Control-Allow-Origin' 'https://hfb.yugioh.top' always;
           add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
           add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Client-Type' always;

           # 允许携带凭证
           add_header 'Access-Control-Allow-Credentials' 'true' always;

           # 代理到后端
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **更新小程序配置**
   ```javascript
   // miniprogram/utils/config.js
   const config = {
     baseUrl: 'https://api.yugioh.top/api',
     wsUrl: 'wss://api.yugioh.top',
     // ...
   };
   ```

4. **更新 Next.js 配置**
   ```typescript
   // next.config.ts
   const config = {
     // 添加 CORS 允许的域名
     async headers() {
       return [
         {
           source: '/api/:path*',
           headers: [
             {
               key: 'Access-Control-Allow-Origin',
               value: 'https://hfb.yugioh.top',
             },
             {
               key: 'Access-Control-Allow-Methods',
               value: 'GET, POST, PUT, DELETE, OPTIONS',
             },
             {
               key: 'Access-Control-Allow-Headers',
               value: 'Content-Type, Authorization, X-Client-Type',
             },
           ],
         },
       ];
     },
   };
   ```

### 方案三：配置 Cloudflare Page Rules

创建 Page Rules 专门处理 API 请求：

```
URL: yugioh.top/api/*
设置：
- Disable Security
- Browser Integrity Check: Off
- Cache Level: Bypass (如果需要实时数据)
```

**注意**：这会降低 `/api` 路径的安全性，建议仅作为临时方案。

## 开发环境配置

### 本地开发

```javascript
// miniprogram/utils/config.js
const config = {
  baseUrl: 'http://localhost:5000/api',
  wsUrl: 'ws://localhost:5000',
  debug: true,
};
```

### Coze 开发环境

```javascript
// miniprogram/utils/config.js
const config = {
  baseUrl: 'https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api',
  wsUrl: 'wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site',
};
```

## 生产环境配置

### 小程序配置（最终版本）

```javascript
// miniprogram/utils/config.js
const config = {
  // 生产环境 API 地址
  baseUrl: 'https://api.yugioh.top/api',  // 使用方案二后更新
  // 或保持：baseUrl: 'https://yugioh.top/api',

  wsUrl: 'wss://api.yugioh.top',

  // 关闭 Mock 数据
  useMockData: false,

  // 关闭调试模式
  debug: false,

  // 其他配置...
};
```

## 部署检查清单

### 部署前检查

- [ ] 更新小程序配置中的 API 地址
- [ ] 配置 CDN 白名单或创建 API 子域名
- [ ] 配置 CORS 允许 `hfb.yugioh.top` 访问
- [ ] 测试 API 连接：`curl -H "X-Client-Type: miniprogram" https://api.yugioh.top/api/accounts`
- [ ] 验证 WebSocket 连接：`wscat -c wss://api.yugioh.top`
- [ ] 检查 SSL 证书有效
- [ ] 配置环境变量（`DATABASE_URL`、微信支付配置等）

### 部署后验证

1. **API 连接测试**
   ```bash
   curl -H "X-Client-Type: miniprogram" https://api.yugioh.top/api/accounts?limit=1
   ```

2. **CORS 测试**
   ```bash
   curl -H "Origin: https://hfb.yugioh.top" \
         -H "Access-Control-Request-Method: POST" \
         -X OPTIONS \
         https://api.yugioh.top/api/accounts
   ```

3. **小程序端测试**
   - 账号列表页面正常加载
   - 登录功能正常
   - 支付功能正常
   - WebSocket 聊天正常

## 推荐方案

### 阶段一：快速上线（方案一）
1. 配置 Cloudflare WAF 规则，允许小程序请求
2. 不需要修改域名结构
3. 配置简单，快速生效

### 阶段二：优化架构（方案二）
1. 创建 `api.yugioh.top` 子域名
2. 独立的 API 域名，更容易管理和扩展
3. 可以单独配置 SSL、CDN 策略

### 阶段三：高可用优化（可选）
1. 配置 API 负载均衡
2. 多地域部署
3. CDN 缓存优化

## 相关文档

- [CDN 配置指南](./CDN-MINIPROGRAM-SETUP.md)
- [小程序部署文档](./MINIPROGRAM-DEPLOYMENT.md)
- [Next.js 部署指南](./NEXTJS-DEPLOYMENT.md)

## 技术支持

如有问题，请联系：
- 开发团队：[开发者邮箱]
- 技术支持：[支持邮箱]
- 文档地址：`https://docs.yugioh.top`
