# 微信小程序合法域名快速配置清单

## 🎯 测试环境域名

**公网域名**：`79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site`

---

## 📝 快速配置清单

### 在微信小程序后台配置

**路径**：开发 -> 开发管理 -> 开发设置 -> 服务器域名

---

### 1. request 合法域名

```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 2. socket 合法域名

```
wss://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 3. uploadFile 合法域名

```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 4. downloadFile 合法域名

```
https://79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 5. udp 合法域名

```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 6. tcp 合法域名

```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 7. DNS 预解析域名

```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

### 8. 预连接域名

```
79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site
```

---

## ⚡ 复制配置

### 一键复制（全部）

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

## 📋 配置步骤

1. **登录微信小程序后台**
   - 访问：https://mp.weixin.qq.com/

2. **进入开发设置**
   - 开发 -> 开发管理 -> 开发设置

3. **修改服务器域名**
   - 找到"服务器域名"部分
   - 点击"修改"按钮

4. **粘贴配置**
   - 将上面的域名配置到对应位置

5. **保存并提交**
   - 点击"保存并提交"
   - 等待生效（5-10分钟）

---

## ⚠️ 重要提示

- ✅ 配置后需要等待 5-10 分钟生效
- ✅ 必须使用 HTTPS 协议（request、socket、uploadFile、downloadFile）
- ✅ 不能带端口号和路径
- ✅ 每类域名最多配置 20 个

---

## 🔧 临时测试方案

如果配置后未生效，可以在开发环境下临时绕过：

**在微信开发者工具中**：
1. 点击右上角"详情"
2. 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
3. 重新编译项目

---

## 📚 详细说明

- 完整配置指南：[WECHAT_DOMAIN_CONFIG_GUIDE.md](WECHAT_DOMAIN_CONFIG_GUIDE.md)
- 微信官方文档：[服务器域名配置](https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/domain-limit.html)

---

**最后更新**: 2026/2/26 22:00
**测试域名**: `79253fff-783d-47d9-af4b-997b7e66b34a.dev.coze.site`
