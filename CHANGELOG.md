# 更新日志

## 版本 1.0.20260226.2137 (2026-02-26 21:37)

### 🐛 Bug 修复
- ✅ **修复 TabBar 配置错误**：删除 `app.json` 中的 `"custom": true` 配置，修复了导致小程序崩溃的运行时错误
- ✅ **修复自定义组件缺失问题**：由于没有创建 `custom-tab-bar` 组件目录，切换到系统默认 TabBar

### 📝 技术细节
- **错误原因**：`app.json` 配置了自定义 TabBar 但没有实现对应组件
- **影响范围**：所有页面无法正常加载，小程序启动时报错
- **解决方案**：删除 `"custom": true"`，使用微信小程序系统默认 TabBar

### 📦 文件修改
- `app.json` - 删除 `"custom": true"` 配置

### 🔍 相关链接
- [自定义 TabBar 文档](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/custom-tabbar.html)

---

## 版本 1.0.20260226.2133 (2026-02-26 21:33)

### 🐛 Bug 修复
- ✅ **修复首页空白问题**：添加 Mock 数据支持
- ✅ **修复 AppID 配置错误**：从 `twx2382e1949d031ba6` 修正为 `wx2382e1949d031ba6`
- ✅ **修复 ES2019 语法错误**：修复 4 个文件中的 `catch {}` 语法错误
- ✅ **修复重复代码问题**：清理重复的代码段

### 📝 新增功能
- ✅ **Mock 数据支持**：添加 `utils/mock-data.js`，包含轮播图、账号列表等测试数据
- ✅ **配置指南**：添加 `CONFIG_GUIDE.md`，详细说明如何配置真实 API

### 📦 文件修改
- `project.config.json` - 修正 AppID
- `utils/config.js` - 添加 `useMockData` 配置
- `utils/request.js` - 修复 catch 语法
- `utils/storage.js` - 修复 catch 语法
- `check-ip-v2.js` - 修复 catch 语法
- `pages/index/index.js` - 添加 Mock 数据加载逻辑

### 📦 文件新增
- `utils/mock-data.js` - Mock 数据文件
- `CONFIG_GUIDE.md` - 配置指南

---

## 初始版本 (2026-02-26)

### ✨ 功能特性
- ✅ 首页展示（轮播图、账号列表）
- ✅ 账号筛选（平台、哈夫币、段位、安全箱、皮肤）
- ✅ 用户认证（登录、注册）
- ✅ 订单管理（列表、详情、支付）
- ✅ 账号管理（详情、发布）
- ✅ 钱包功能（充值、提现）
- ✅ 聊天功能（列表、详情）
- ✅ 个人中心（资料编辑、实名认证）

### 🛠 技术栈
- Next.js 16.1.1
- React 19.2.3
- TypeScript 5
- Drizzle ORM 0.45.1
- PostgreSQL 8.16.3
- Socket.io 4.8.3
- Tailwind CSS 4
- 微信小程序原生开发（WXML/WXSS/JavaScript）

### 📦 项目结构
```
miniprogram/
├── pages/          # 页面目录
│   ├── index/      # 首页
│   ├── auth/       # 认证
│   ├── order/      # 订单
│   ├── account/    # 账号
│   ├── wallet/     # 钱包
│   ├── chat/       # 聊天
│   └── profile/    # 个人中心
├── utils/          # 工具函数
│   ├── api.js      # API 接口
│   ├── request.js  # 网络请求
│   ├── storage.js  # 本地存储
│   ├── config.js   # 配置
│   └── mock-data.js # Mock 数据
├── components/     # 公共组件
├── app.js          # 小程序入口
├── app.json        # 小程序配置
├── app.wxss        # 全局样式
└── project.config.json # 项目配置
```

---

## 已知问题

### 当前版本 (1.0.20260226.2137)
- ⚠️ 使用 Mock 数据模式，所有后端接口使用测试数据
- ⚠️ 需要配置真实 API 地址才能使用完整功能
- ⚠️ 需要配置微信服务器域名白名单

### 功能状态
**可用功能**（使用 Mock 数据）：
- ✅ 首页浏览
- ✅ 账号列表展示
- ✅ 筛选功能
- ✅ 所有页面导航
- ✅ UI 界面

**需要后端 API**：
- ⚠️ 登录/注册
- ⚠️ 账号租赁
- ⚠️ 支付功能
- ⚠️ 聊天功能
- ⚠️ 钱包功能

---

## 后续计划

### 短期计划
- [ ] 配置真实后端 API
- [ ] 配置微信服务器域名白名单
- [ ] 完成小程序审核
- [ ] 上线测试

### 中期计划
- [ ] 实现自定义 TabBar（如需要）
- [ ] 优化 UI/UX
- [ ] 添加更多功能
- [ ] 性能优化

### 长期计划
- [ ] 支付宝小程序
- [ ] 抖音小程序
- [ ] 多平台适配

---

**最后更新**: 2026/2/26 21:37
