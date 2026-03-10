# 微信小程序合法域名配置指南

## 📋 配置概述

### 测试环境域名

**公网域名**：`https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/`

---

## 🔧 配置步骤

### 1. 登录微信小程序后台

1. 访问：https://mp.weixin.qq.com/
2. 使用管理员账号登录
3. 进入：**开发** -> **开发管理** -> **开发设置**
4. 找到"**服务器域名**"部分

### 2. 配置各类合法域名

---

## 📝 详细配置

### 1. request 合法域名

**用途**：用于 `wx.request`、`wx.requestPayment` 等 HTTP 请求

**配置域名**：
```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

**说明**：
- 必须使用 HTTPS 协议
- 不能带端口号（默认 443）
- 不能带路径
- 不支持 IP 地址

**示例请求**：
```javascript
wx.request({
  url: 'https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api/test',
  method: 'GET',
  success(res) {
    console.log(res.data);
  }
});
```

---

### 2. socket 合法域名

**用途**：用于 `wx.connectSocket`、`wx.onSocketOpen` 等 WebSocket 连接

**配置域名**：
```
wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

**说明**：
- 必须使用 WSS 协议（WebSocket Secure）
- 不能带端口号（默认 443）
- 不支持 IP 地址

**示例连接**：
```javascript
wx.connectSocket({
  url: 'wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/ws',
  success() {
    console.log('WebSocket 连接成功');
  }
});
```

---

### 3. uploadFile 合法域名

**用途**：用于 `wx.uploadFile` 文件上传

**配置域名**：
```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

**说明**：
- 必须使用 HTTPS 协议
- 不能带端口号（默认 443）
- 不能带路径
- 不支持 IP 地址

**示例上传**：
```javascript
wx.chooseImage({
  success(res) {
    const tempFilePaths = res.tempFilePaths;
    wx.uploadFile({
      url: 'https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api/upload',
      filePath: tempFilePaths[0],
      name: 'file',
      success(res) {
        console.log('上传成功', res.data);
      }
    });
  }
});
```

---

### 4. downloadFile 合法域名

**用途**：用于 `wx.downloadFile` 文件下载

**配置域名**：
```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

**说明**：
- 必须使用 HTTPS 协议
- 不能带端口号（默认 443）
- 不能带路径
- 不支持 IP 地址

**示例下载**：
```javascript
wx.downloadFile({
  url: 'https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/files/test.pdf',
  success(res) {
    console.log('下载成功', res.tempFilePath);
  }
});
```

---

### 5. udp 合法域名

**用途**：用于 UDP 网络通信

**配置域名**：
```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

**说明**：
- 不需要协议前缀
- 可以指定端口号（如果需要）
- 格式：`域名:端口` 或仅 `域名`
- 不支持 IP 地址

**示例配置**：
```
# 如果后端 UDP 服务在 8080 端口
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site:8080

# 如果使用默认端口
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 6. tcp 合法域名

**用途**：用于 TCP 网络通信

**配置域名**：
```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

**说明**：
- 不需要协议前缀
- 可以指定端口号（如果需要）
- 格式：`域名:端口` 或仅 `域名`
- 不支持 IP 地址

**示例配置**：
```
# 如果后端 TCP 服务在 8080 端口
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site:8080

# 如果使用默认端口
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 7. DNS 预解析域名

**用途**：预先解析域名，加速 DNS 查询

**配置域名**：
```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

**说明**：
- 可以配置 HTTPS 协议
- 可以配置多个域名
- 小程序启动时会预先解析

**示例配置**：
```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 8. 预连接域名

**用途**：预先建立 TCP 连接，加速网络请求

**配置域名**：
```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

**说明**：
- 可以配置 HTTPS 协议
- 可以配置多个域名
- 小程序启动时会预先连接

**示例配置**：
```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

## 📋 配置汇总表

| 类型 | 配置域名 | 协议 | 端口 | 说明 |
|------|---------|------|------|------|
| request | `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site` | HTTPS | 443 | HTTP 请求 |
| socket | `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site` | WSS | 443 | WebSocket |
| uploadFile | `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site` | HTTPS | 443 | 文件上传 |
| downloadFile | `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site` | HTTPS | 443 | 文件下载 |
| udp | `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site` | - | 自定义 | UDP 通信 |
| tcp | `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site` | - | 自定义 | TCP 通信 |
| DNS 预解析 | `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site` | - | - | DNS 预解析 |
| 预连接 | `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site` | - | - | 预先连接 |

---

## 🚀 配置操作步骤

### 在微信小程序后台配置

1. **登录后台**
   - 访问：https://mp.weixin.qq.com/
   - 使用管理员账号登录

2. **进入开发设置**
   - 点击左侧菜单：**开发**
   - 点击：**开发管理**
   - 点击：**开发设置**

3. **找到服务器域名**
   - 向下滚动到"**服务器域名**"部分
   - 点击"**修改**"按钮

4. **配置各类域名**
   - **request 合法域名**：
     ```
     https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
     ```
   - **socket 合法域名**：
     ```
     wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
     ```
   - **uploadFile 合法域名**：
     ```
     https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
     ```
   - **downloadFile 合法域名**：
     ```
     https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
     ```
   - **udp 合法域名**：
     ```
     79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
     ```
   - **tcp 合法域名**：
     ```
     79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
     ```
   - **DNS 预解析域名**：
     ```
     79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
     ```
   - **预连接域名**：
     ```
     79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
     ```

5. **保存配置**
   - 点击"**保存并提交**"按钮
   - 等待审核通过（通常几分钟到几小时）

---

## ⚠️ 重要注意事项

### 1. 域名限制

- ✅ 只能配置域名，不能配置 IP 地址
- ✅ 必须使用 HTTPS 协议（request、socket、uploadFile、downloadFile）
- ✅ 不能带端口号（除非是 UDP/TCP）
- ✅ 不能带路径
- ✅ 每类域名最多可配置 20 个

### 2. 证书要求

- ✅ SSL 证书必须有效
- ✅ 证书必须由受信任的 CA 签发
- ✅ 证书不能过期
- ✅ 证书必须包含配置的域名

### 3. 生效时间

- ⏱️ 配置后通常需要 **5-10 分钟**生效
- ⏱️ 如未生效，请等待更长时间或重新配置
- ⏱️ 建议配置后等待 15 分钟再测试

### 4. 开发环境测试

在开发环境下，可以临时绕过合法域名限制：

**方法1：在微信开发者工具中设置**
1. 打开微信开发者工具
2. 点击右上角"**详情**"
3. 勾选"**不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**"
4. 重新编译项目

**方法2：在代码中设置（仅开发环境）**
```javascript
// app.js
App({
  onLaunch() {
    // 开发环境下跳过域名检查
    if (process.env.NODE_ENV === 'development') {
      wx.config({
        debug: true
      });
    }
  }
});
```

---

## 🔍 测试域名配置

### 测试 request 请求

```javascript
// 在小程序中测试
wx.request({
  url: 'https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api/health',
  method: 'GET',
  success(res) {
    console.log('✅ request 请求成功', res);
  },
  fail(err) {
    console.error('❌ request 请求失败', err);
  }
});
```

### 测试 WebSocket 连接

```javascript
// 在小程序中测试
wx.connectSocket({
  url: 'wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/ws',
  success() {
    console.log('✅ WebSocket 连接成功');
  },
  fail(err) {
    console.error('❌ WebSocket 连接失败', err);
  }
});
```

### 测试文件上传

```javascript
// 在小程序中测试
wx.chooseImage({
  success(res) {
    wx.uploadFile({
      url: 'https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api/upload',
      filePath: res.tempFilePaths[0],
      name: 'file',
      success(res) {
        console.log('✅ 文件上传成功', res);
      },
      fail(err) {
        console.error('❌ 文件上传失败', err);
      }
    });
  }
});
```

### 测试文件下载

```javascript
// 在小程序中测试
wx.downloadFile({
  url: 'https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/files/test.pdf',
  success(res) {
    console.log('✅ 文件下载成功', res.tempFilePath);
  },
  fail(err) {
    console.error('❌ 文件下载失败', err);
  }
});
```

---

## 📚 相关文档

- [微信小程序服务器域名配置](https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/domain-limit.html)
- [微信小程序网络请求](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)
- [微信小程序 WebSocket](https://developers.weixin.qq.com/miniprogram/dev/api/network/websocket/wx.connectSocket.html)

---

## 🆘 常见问题

### Q1: 配置后仍然无法请求？

**解决方案**：
1. 检查域名是否正确
2. 等待 15-30 分钟让配置生效
3. 检查 SSL 证书是否有效
4. 在开发者工具中勾选"不校验合法域名"测试

### Q2: 提示域名不在合法域名列表？

**解决方案**：
1. 确认域名已正确配置
2. 检查域名格式是否正确（不能带端口号、路径）
3. 等待配置生效
4. 检查是否选择了正确的小程序（AppID）

### Q3: WebSocket 连接失败？

**解决方案**：
1. 确认使用 WSS 协议（不是 WS）
2. 检查域名是否配置在 socket 合法域名中
3. 确认后端 WebSocket 服务正常运行
4. 检查网络连接

---

**最后更新**: 2026/2/26 22:00
**测试域名**: `https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/`
