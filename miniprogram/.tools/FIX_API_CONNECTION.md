# 小程序API连接失败修复指南

## ❌ 问题描述

错误信息：
```
request:fail errcode:-102 cronet_error_code:-102 error_msg:net::ERR_CONNECTION_REFUSED
```

## 🔍 问题原因

小程序开发环境配置了本地API地址 `http://localhost:5000/api`，但微信开发者工具默认会校验请求的域名是否在白名单中，导致请求被拦截。

---

## ✅ 解决方案

### 方案一：开启"不校验合法域名"（开发环境推荐）

**步骤**：

1. **打开微信开发者工具**
2. **点击右上角「详情」按钮**
3. **切换到「本地设置」标签**
4. **勾选以下选项**：
   - ✅ **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**
   - ✅ **启用调试**
   - ✅ **启用 ES6 转 ES5**
   - ✅ **启用增强编译**
5. **重新编译项目**

**截图位置**：
```
微信开发者工具 → 右上角「详情」 → 「本地设置」
```

---

### 方案二：使用Mock数据（临时方案）

如果暂时无法连接后端，可以使用Mock数据进行测试。

**步骤**：

1. 修改 `miniprogram/utils/config.js`：

```javascript
const ENV = 'development';

const environments = {
  development: {
    baseUrl: 'http://localhost:5000/api',
    debug: true,
    useMockData: true,  // 改为 true
  },
  // ...
};
```

2. 保存后重新编译

---

### 方案三：配置服务器白名单（生产环境）

**生产环境必须配置**，但需要将 `ENV` 改为 `'production'`。

**步骤**：

1. 登录微信公众平台：https://mp.weixin.qq.com/
2. 进入：开发 → 开发管理 → 开发设置 → 服务器域名
3. 添加以下域名到 request 合法域名：
   ```
   https://yugioh.top
   ```
4. 保存并等待生效（可能需要几分钟）

**注意**：
- 域名必须是 HTTPS
- 需要备案的域名
- 生产环境不能使用 `localhost`

---

## 🔧 其他问题修复

### 问题1：vConsole调试按钮显示

**原因**：调试模式未关闭

**解决**：
- 开发环境：可以保留，方便调试
- 生产环境：关闭调试模式

```javascript
// miniprogram/utils/config.js
const config = {
  debug: false,  // 生产环境改为 false
  // ...
};
```

---

### 问题2：哈夫币筛选输入框显示异常

**原因**：前端渲染问题

**检查**：`miniprogram/pages/index/index.wxml` 中的哈夫币输入框配置

**可能的修复**：
```xml
<view class="filter-input-group">
  <input class="filter-input" type="number" placeholder="最小" />
  <text class="filter-separator">-</text>
  <input class="filter-input" type="number" placeholder="最大" />
</view>
```

---

### 问题3："发布账号"按钮重复显示

**原因**：页面重复加载或模板重复渲染

**检查**：`miniprogram/pages/index/index.wxml` 中是否有重复的按钮

---

## 🚀 快速修复步骤

### 当前最快的修复方式（推荐）：

1. **打开微信开发者工具**
2. **点击右上角「详情」**
3. **切换到「本地设置」**
4. **勾选**「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」
5. **点击「清缓存」→「清除文件缓存」**
6. **点击「编译」**
7. **刷新页面**

---

## 📋 检查清单

修复前请确认：

- [ ] 后端服务正在运行（`http://localhost:5000`）
- [ ] 小程序开发者工具已打开
- [ ] 已勾选"不校验合法域名"
- [ ] 已重新编译项目
- [ ] 已清除缓存

---

## 🎯 预期结果

修复后应该看到：
- ✅ 账号列表正常加载
- ✅ 筛选功能正常使用
- ✅ 所有接口正常响应

---

## 📞 如果问题依然存在

### 检查1：后端服务是否正常

```bash
# 在终端执行
curl http://localhost:5000/api/accounts
```

应该返回JSON数据，不是错误。

---

### 检查2：网络连接

```bash
# 检查端口是否监听
ss -lptn 'sport = :5000'
```

应该看到node进程在监听5000端口。

---

### 检查3：小程序日志

在微信开发者工具中：
1. 打开「调试器」
2. 切换到「Console」标签
3. 查看是否有其他错误信息

---

### 检查4：尝试使用Mock数据

如果以上都无法解决，临时使用Mock数据：

```javascript
// miniprogram/utils/config.js
useMockData: true,
```

---

## 📚 相关文档

- [微信小程序网络请求](https://developers.weixin.qq.com/miniprogram/dev/framework/server-communication.html)
- [服务器域名配置](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)

---

**最后更新**: 2026-02-27
**文档版本**: 1.0
