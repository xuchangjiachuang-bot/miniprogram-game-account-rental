# 小程序 API CDN 配置指南

## 问题描述

当小程序访问 `https://yugioh.top/api` 时，被 CDN/防护服务（如 Cloudflare）拦截，返回指纹验证页面（HTML），而不是预期的 JSON 数据。

### 错误现象

```json
{
  "success": false,
  "error": "请求失败",
  "data": "<html>...FingerprintJS 脚本...</html>"
}
```

## 原因分析

API 服务器部署在 CDN/防护服务（如 Cloudflare、Akamai）后面，启用了人机验证（Bot Protection）或浏览器指纹验证。小程序的 `wx.request` 无法执行 JavaScript 来完成验证流程。

## 解决方案

### 方案一：配置 CDN 白名单（推荐）

#### Cloudflare 配置

1. **创建 WAF 规则**
   - 登录 Cloudflare Dashboard
   - 选择你的域名：`yugioh.top`
   - 进入 Security > WAF > Custom Rules
   - 创建新规则：

   ```
   规则名称：Allow Miniprogram API Requests
   规则条件：
   - (http.request.uri.path contains "/api")
   - AND (
     - (http.request.headers["x-client-type"] contains "miniprogram")
     - OR (http.request.headers["x-requested-with"] contains "XMLHttpRequest")
   )
   动作：Allow
   ```
   
2. **Bot Protection 跳过**
   - 进入 Security > Bot Management
   - 创建 Bot Protection 跳过规则：
   ```
   路径：/api/*
   Header：X-Client-Type: miniprogram
   动作：Skip Bot Protection
   ```

#### 其他 CDN 服务

根据你使用的 CDN 服务，查找类似的配置选项：
- **阿里云 CDN/WAF**：配置白名单规则
- **腾讯云 CDN/WAF**：配置访问控制规则
- **Akamai**：配置 Bot Management 跳过规则

### 方案二：使用专用 API 子域名

创建一个不经过 CDN 验证的专用 API 子域名：

1. **创建 DNS 记录**
   ```
   api-direct.yugioh.top A [服务器IP]
   ```
   - 不添加 CDN 代理（灰色云朵）

2. **更新小程序配置**
   ```javascript
   // miniprogram/utils/config.js
   const config = {
     baseUrl: 'https://api-direct.yugioh.top/api',
     // ...
   };
   ```

### 方案三：服务器端配置 Nginx/Apache

在服务器端配置，添加响应头：

#### Nginx 配置

```nginx
server {
    listen 443 ssl;
    server_name yugioh.top;

    location /api/ {
        # 添加 CORS 头
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Client-Type, X-Requested-With' always;

        # 识别小程序请求
        if ($http_x_client_type = "miniprogram") {
            add_header 'X-Miniprogram-Request' 'true' always;
        }

        # 代理到后端
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apache 配置

```apache
<VirtualHost *:443>
    ServerName yugioh.top

    <Location /api/>
        # 添加 CORS 头
        Header always set Access-Control-Allow-Origin "*"
        Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Client-Type, X-Requested-With"

        # 识别小程序请求
        Header always set X-Miniprogram-Request "true" env=miniprogram

        # 代理到后端
        ProxyPass http://localhost:5000/
        ProxyPassReverse http://localhost:5000/
    </Location>

    # 设置环境变量
    SetEnvIfNoCase X-Client-Type "miniprogram" miniprogram
</VirtualHost>
```

### 方案四：配置 Cloudflare Page Rules

创建 Page Rules 来跳过 API 路径的验证：

1. 进入 Cloudflare Dashboard > Rules > Page Rules
2. 创建新规则：
   ```
   URL: yugioh.top/api/*
   设置：
   - Disable Security
   - Browser Integrity Check: Off
   ```
3. 优先级设置为最高

## 小程序端配置（已完成）

已在 `miniprogram/utils/request.js` 中添加请求标识：

```javascript
header: {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'X-Client-Type': 'miniprogram',
  'X-Client-Platform': 'wechat',
  ...requestOptions.header
}
```

## 验证步骤

### 1. 测试 API 端点

```bash
# 测试是否返回 JSON
curl -H "X-Client-Type: miniprogram" https://yugioh.top/api/accounts?limit=1

# 预期响应：JSON 格式的账号列表
```

### 2. 小程序端测试

在小程序中调用 API，检查：
- 不再返回 HTML 页面
- 返回正确的 JSON 数据
- 数据与后端数据库同步

## 临时解决方案

如果无法立即配置 CDN，可以使用以下临时方案：

1. **使用本地开发环境**
   ```javascript
   // 临时切换到本地 API
   baseUrl: 'http://localhost:5000/api',
   ```

2. **使用内网 IP**
   ```javascript
   // 使用服务器的公网 IP（绕过域名 CDN）
   baseUrl: 'http://123.45.67.89:5000/api',
   ```

**注意**：这些临时方案仅用于测试，生产环境不建议使用。

## 推荐方案优先级

1. ✅ **方案一**：配置 CDN 白名单（最安全、最稳定）
2. ✅ **方案二**：使用专用 API 子域名（简单易用）
3. ⚠️ **方案三**：服务器端配置（需要修改服务器配置）
4. ❌ **方案四**：Page Rules（可能影响整个站点的安全性）
5. 🚫 **临时方案**：不推荐生产环境使用

## 联系支持

如果以上方案都无法解决问题，请联系：
- CDN 服务商技术支持
- 服务器管理员
- 小程序开发团队

## 相关文档

- [Cloudflare WAF 配置](https://developers.cloudflare.com/waf/)
- [小程序网络请求文档](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)
- [CORS 配置指南](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)
