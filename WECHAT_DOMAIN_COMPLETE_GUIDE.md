# 微信小程序域名配置 - 完整方案

## 🎯 测试结果总结

### ✅ 测试通过

```
✅ DNS 解析成功
✅ TCP 连接成功
✅ HTTPS 连接成功（状态码 200）
✅ HTTP 请求成功
```

**结论**：域名可以正常使用，可以直接配置到微信小程序后台。

---

## 📝 快速配置

### 测试环境域名

**公网域名**：`79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site`

---

### 配置清单

#### 1. request 合法域名

```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

#### 2. socket 合法域名

```
wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

#### 3. uploadFile 合法域名

```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

#### 4. downloadFile 合法域名

```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

#### 5. udp 合法域名

```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

#### 6. tcp 合法域名

```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

#### 7. DNS 预解析域名

```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

#### 8. 预连接域名

```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

## 🚀 配置步骤

### 1. 登录微信小程序后台

1. 访问：https://mp.weixin.qq.com/
2. 使用管理员账号登录

### 2. 进入开发设置

1. 点击左侧菜单：**开发**
2. 点击：**开发管理**
3. 点击：**开发设置**

### 3. 修改服务器域名

1. 向下滚动到"**服务器域名**"部分
2. 点击"**修改**"按钮

### 4. 配置各类域名

将上面的域名配置到对应位置：
- **request 合法域名**：粘贴 request 域名
- **socket 合法域名**：粘贴 socket 域名
- **uploadFile 合法域名**：粘贴 uploadFile 域名
- **downloadFile 合法域名**：粘贴 downloadFile 域名
- **udp 合法域名**：粘贴 udp 域名
- **tcp 合法域名**：粘贴 tcp 域名
- **DNS 预解析域名**：粘贴 DNS 预解析域名
- **预连接域名**：粘贴预连接域名

### 5. 保存并提交

1. 点击"**保存并提交**"按钮
2. 等待生效（**5-10 分钟**）

---

## ⚡ 一键复制（全部）

```
request: https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
socket: wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
uploadFile: https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
downloadFile: https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
udp: 79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
tcp: 79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
DNS预解析: 79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
预连接: 79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

## ⚠️ 重要提示

### 配置后生效时间

- ⏱️ 配置后通常需要 **5-10 分钟**生效
- ⏱️ 如未生效，请等待更长时间或重新配置
- ⏱️ 建议配置后等待 **15 分钟**再测试

### 临时测试方案

如果配置后未生效，可以在开发环境下临时绕过：

**在微信开发者工具中**：
1. 点击右上角"**详情**"
2. 勾选"**不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**"
3. 重新编译项目

---

## 📚 相关文档

- **详细配置指南**：[WECHAT_DOMAIN_CONFIG_GUIDE.md](WECHAT_DOMAIN_CONFIG_GUIDE.md)
- **快速配置清单**：[WECHAT_DOMAIN_QUICK_CONFIG.md](WECHAT_DOMAIN_QUICK_CONFIG.md)
- **微信官方文档**：[服务器域名配置](https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/domain-limit.html)

---

## 🧪 测试工具

### 运行测试脚本

```bash
node test-wechat-domain.js
```

**测试内容**：
- DNS 解析
- TCP 连接
- HTTPS 连接
- HTTP 请求

---

## 🎯 使用示例

### 小程序中调用 API

```javascript
// pages/index/index.js
Page({
  onLoad() {
    this.fetchData();
  },

  fetchData() {
    wx.request({
      url: 'https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api/health',
      method: 'GET',
      success(res) {
        console.log('✅ 请求成功', res);
      },
      fail(err) {
        console.error('❌ 请求失败', err);
      }
    });
  }
});
```

### 小程序中上传文件

```javascript
wx.chooseImage({
  success(res) {
    wx.uploadFile({
      url: 'https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/api/upload',
      filePath: res.tempFilePaths[0],
      name: 'file',
      success(res) {
        console.log('✅ 上传成功', res);
      }
    });
  }
});
```

### 小程序中连接 WebSocket

```javascript
wx.connectSocket({
  url: 'wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/ws',
  success() {
    console.log('✅ WebSocket 连接成功');
  }
});
```

---

## ✅ 配置完成检查清单

- [ ] 已登录微信小程序后台
- [ ] 已进入开发设置
- [ ] 已配置 request 合法域名
- [ ] 已配置 socket 合法域名
- [ ] 已配置 uploadFile 合法域名
- [ ] 已配置 downloadFile 合法域名
- [ ] 已配置 udp 合法域名
- [ ] 已配置 tcp 合法域名
- [ ] 已配置 DNS 预解析域名
- [ ] 已配置预连接域名
- [ ] 已保存并提交
- [ ] 已等待 5-10 分钟
- [ ] 已在小程序中测试 API 请求
- [ ] API 请求正常工作

---

## 🆘 常见问题

### Q1: 配置后仍然无法请求？

**解决方案**：
1. 检查域名是否正确
2. 等待 15-30 分钟让配置生效
3. 在开发者工具中勾选"不校验合法域名"测试
4. 检查后端服务是否正常运行

### Q2: 提示域名不在合法域名列表？

**解决方案**：
1. 确认域名已正确配置
2. 检查域名格式是否正确（不能带端口号、路径）
3. 等待配置生效
4. 检查是否选择了正确的小程序（AppID）

### Q3: 提示 SSL 证书无效？

**解决方案**：
1. 检查 SSL 证书是否有效
2. 确认证书由受信任的 CA 签发
3. 确认证书没有过期
4. 确认证书包含配置的域名

---

**最后更新**: 2026/2/26 22:00
**测试域名**: `https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site/`
**测试结果**: ✅ 所有测试通过
