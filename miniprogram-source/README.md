# 游戏账号租赁平台 - 微信小程序

## 📱 项目信息

- **项目名称**: 游戏账号租赁平台
- **小程序AppID**: `twx2382e1949d031ba6`
- **开发方式**: 原生小程序开发（WXML/WXSS/JavaScript）
- **后端API**: Next.js API Routes（共享）
- **数据库**: PostgreSQL（共享）

## 🚀 快速开始

### 预览小程序

有两种方式可以预览小程序：

#### 方式一：微信开发者工具（推荐）

1. **安装微信开发者工具**
   ```
   https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
   ```

2. **导入项目**
   - 项目目录：`miniprogram/`
   - AppID：`twx2382e1949d031ba6`

3. **配置服务器域名**
   - 登录微信公众平台：https://mp.weixin.qq.com
   - 进入：开发 → 开发管理 → 开发设置 → 服务器域名
   - 添加您的API域名和WebSocket域名

4. **配置后端地址**
   ```javascript
   // 编辑 utils/config.js
   module.exports = {
     API_BASE_URL: 'https://your-api-domain.com',
     WEBSOCKET_URL: 'wss://your-socket-domain.com',
     APPID: 'twx2382e1949d031ba6'
   };
   ```

5. **生成预览**
   - 点击工具栏"预览"按钮
   - 扫码预览

#### 方式二：Coze 编程预览

1. **访问 Coze**
   ```
   https://www.coze.cn
   ```

2. **创建小程序项目**
   - 点击"小程序"选项卡
   - 输入详细的需求描述
   - 等待 AI 生成代码

3. **绑定 AppID**
   - 点击"AppID 设置"
   - 输入：`twx2382e1949d031ba6`
   - 扫码授权

4. **生成预览**
   - 扫描页面右侧的二维码
   - 在微信中预览

## 📁 项目结构

```
miniprogram/
├── pages/                    # 页面
│   ├── index/               # 首页
│   ├── auth/                # 认证模块
│   │   ├── login/           # 登录页
│   │   ├── phone-binding/   # 手机号绑定
│   │   └── phone-manual/    # 手动输入手机号
│   ├── order/               # 订单模块
│   │   ├── list/            # 订单列表
│   │   ├── detail/          # 订单详情
│   │   └── payment/         # 订单支付
│   ├── account/             # 账号模块
│   │   ├── detail/          # 账号详情
│   │   └── publish/         # 账号发布
│   ├── wallet/              # 钱包模块
│   │   ├── index/           # 钱包首页
│   │   ├── recharge/        # 钱包充值
│   │   └── withdraw/        # 钱包提现
│   ├── chat/                # 聊天模块
│   │   ├── list/            # 聊天列表
│   │   └── detail/          # 聊天详情
│   └── profile/             # 个人中心
│       ├── index/           # 个人中心首页
│       ├── edit/            # 个人资料编辑
│       └── verify/          # 实名认证
├── components/              # 组件
│   ├── custom-tabbar/       # 自定义底部导航
│   └── image-uploader/      # 图片上传组件
├── utils/                   # 工具类
│   ├── config.js            # 配置文件
│   ├── storage.js           # 本地存储
│   ├── request.js           # HTTP请求
│   ├── api.js               # API封装
│   └── chat.js              # WebSocket客户端
├── styles/                  # 全局样式
│   └── variables.wxss       # CSS变量
├── app.js                   # 小程序入口
├── app.json                 # 小程序配置
├── app.wxss                 # 全局样式
└── project.config.json      # 项目配置
```

## 🎨 核心功能

- ✅ **用户认证**: 微信登录、手机号绑定
- ✅ **首页**: 轮播图、账号列表、筛选功能
- ✅ **账号管理**: 账号详情、账号发布（包含皮肤配置、租赁设置）
- ✅ **订单管理**: 订单列表、订单详情、支付、取消、续租
- ✅ **钱包系统**: 余额展示、充值、提现、交易记录
- ✅ **实时聊天**: 聊天列表、聊天详情、实时消息
- ✅ **个人中心**: 用户信息、个人资料编辑、实名认证

## 📄 页面说明

### 首页 (pages/index)
- 轮播图展示
- 账号列表（支持筛选）
- 账号详情跳转

### 认证模块 (pages/auth)
- **login**: 微信登录入口
- **phone-binding**: 手机号快速绑定
- **phone-manual**: 手动输入手机号

### 订单模块 (pages/order)
- **list**: 订单列表（支持状态筛选）
- **detail**: 订单详情（包含状态展示、游戏账号、退租信息、操作按钮、聊天入口）
- **payment**: 订单支付（支持微信支付和余额支付）

### 账号模块 (pages/account)
- **detail**: 账号详情（包含账号信息、皮肤列表、价格选择、立即租赁）
- **publish**: 账号发布（包含图片上传、基本信息、游戏信息、皮肤配置、租赁设置）

### 钱包模块 (pages/wallet)
- **index**: 钱包首页（余额展示、交易记录、快捷入口）
- **recharge**: 钱包充值（金额选择、支付方式、充值说明）
- **withdraw**: 钱包提现（金额输入、账户选择、手续费计算）

### 聊天模块 (pages/chat)
- **list**: 聊天列表（群组列表）
- **detail**: 聊天详情（实时消息、发送消息、查看订单）

### 个人中心 (pages/profile)
- **index**: 个人中心首页（用户信息、功能入口、设置）
- **edit**: 个人资料编辑（头像、昵称、手机号、个性签名）
- **verify**: 实名认证（姓名、身份证号、身份证照片、认证状态）

## 🔧 配置清单

### 必需配置

- [x] AppID: `twx2382e1949d031ba6`
- [ ] 后端API地址
- [ ] WebSocket地址
- [ ] 服务器域名白名单

### 可选配置

- [ ] 对象存储地址
- [ ] 微信支付商户号
- [ ] 其他第三方服务

## 📚 文档

- **Coze 预览配置完整指南**: `COZE预览配置完整指南.md`
- **快速开始指南**: `quick-start.html`（可视化页面）
- **项目开发方案**: `../docs/小程序完整开发方案.md`

## ⚠️ 注意事项

1. **域名要求**
   - 必须使用 HTTPS 协议
   - 必须在微信公众平台配置白名单
   - 必须已完成 ICP 备案

2. **AppID 权限**
   - 确保绑定的账号有管理权限
   - 个人账号无法开通支付功能

3. **预览限制**
   - 开发版预览仅供开发者测试
   - 正式发布需要通过微信审核

## 📞 帮助与支持

- **微信开发文档**: https://developers.weixin.qq.com/miniprogram/dev/framework/
- **Coze 文档**: https://docs.coze.cn/guides/vibe_coding_miniapp
- **微信公众平台**: https://mp.weixin.qq.com

## 📝 更新日志

- **v1.0** (2025-01-XX)
  - 完成小程序基础框架
  - 实现核心功能模块
  - 添加预览配置文档
  - 完成所有核心页面开发

---

**文档版本**: v1.0  
**最后更新**: 2025-01-XX
