# 📁 小程序项目结构

## 目录说明

```
miniprogram/
├── .tools/                    # 工具脚本和文档目录（不参与编译）
│   ├── upload.js             # 小程序上传脚本
│   ├── *.js                  # 诊断和检查脚本
│   ├── upload-*.js           # 各种上传脚本
│   └── *.md                  # 文档
├── app.js                    # 小程序入口文件
├── app.json                  # 小程序配置文件
├── app.wxss                  # 全局样式
├── project.config.json       # 项目配置文件
├── components/               # 自定义组件
│   ├── custom-tabbar/        # 自定义TabBar
│   └── image-uploader/       # 图片上传组件
├── pages/                    # 页面
│   ├── account/              # 账号相关
│   │   ├── detail/           # 账号详情
│   │   └── publish/          # 发布账号
│   ├── auth/                 # 认证相关
│   │   ├── login/            # 登录
│   │   ├── wechat-login/     # 微信登录
│   │   └── bind-phone/       # 绑定手机号
│   ├── chat/                 # 聊天相关
│   │   ├── list/             # 聊天列表
│   │   └── detail/           # 聊天详情
│   ├── index/                # 首页
│   ├── order/                # 订单相关
│   │   ├── list/             # 订单列表
│   │   ├── detail/           # 订单详情
│   │   └── payment/          # 订单支付
│   ├── profile/              # 个人中心
│   │   ├── edit/             # 编辑资料
│   │   └── verify/           # 实名认证
│   └── wallet/               # 钱包相关
│       ├── bill/             # 账单明细
│       ├── index/            # 钱包首页
│       ├── recharge/         # 充值
│       ├── withdraw/         # 提现
│       └── withdraw-detail/  # 提现详情
└── utils/                    # 工具函数
    ├── config.js             # 环境配置
    ├── data-transformer.js   # 数据转换工具
    ├── order-transformer.js  # 订单数据转换
    └── request.js            # 请求封装
```

## 🚀 如何上传小程序

### 方法1：使用工具脚本（推荐）

```bash
cd /workspace/projects/miniprogram
node .tools/upload.js
```

### 方法2：使用npm脚本

```bash
cd /workspace/projects/miniprogram
npm run upload
```

### 方法3：使用npx命令

```bash
cd /workspace/projects/miniprogram
npx miniprogram-ci upload --appid wx2382e1949d031ba6 --project-path . --private-key-path private.wx2382e1949d031ba6.key --upload-version 1.0.20260227.1530 --upload-description "版本描述" --use-project-config
```

---

## ⚙️ 环境配置

### 开发环境
```javascript
// utils/config.js
const ENV = 'development';

// API地址
baseUrl: 'http://localhost:5000/api'
wsUrl: 'ws://localhost:5000'
```

### 生产环境
```javascript
// utils/config.js
const ENV = 'production';

// API地址（二级域名）
baseUrl: 'https://hfb.yugioh.top/api'
wsUrl: 'wss://hfb.yugioh.top'
```

**注意**：生产环境已使用二级域名 `hfb.yugioh.top`，而不是一级域名 `yugioh.top`。

---

## 📋 项目配置

### project.config.json 重要配置

```json
{
  "appid": "wx2382e1949d031ba6",
  "packOptions": {
    "ignore": [
      {
        "value": ".tools",
        "type": "folder"
      },
      {
        "value": "private.*.key",
        "type": "file"
      }
    ]
  },
  "setting": {
    "urlCheck": true,
    "es6": true,
    "minified": true
  }
}
```

**说明**：
- `.tools` 目录被忽略，不会参与编译
- 私钥文件 `private.*.key` 不会被上传

---

## 🔑 关键信息

- **小程序AppID**: `wx2382e1949d031ba6`
- **开发环境API**: `http://localhost:5000/api`
- **生产环境API**: `https://hfb.yugioh.top/api`
- **生产环境WebSocket**: `wss://hfb.yugioh.top`

---

## 📝 关于二级域名

### 为什么使用二级域名？

1. **安全性**：API和主站分离，降低安全风险
2. **扩展性**：可以独立配置CDN、负载均衡
3. **规范性**：符合微服务架构最佳实践
4. **管理方便**：API和前端分离，便于管理

### 域名配置

```
主域名：yugioh.top
二级域名：hfb.yugioh.top（API专用）
```

**影响**：
- ✅ 小程序会连接 `https://hfb.yugioh.top/api`
- ✅ WebSocket会连接 `wss://hfb.yugioh.top`
- ✅ 所有API请求都走二级域名

---

## ⚠️ 注意事项

1. **环境切换**
   - 开发时：`ENV = 'development'`
   - 发布时：`ENV = 'production'`

2. **IP白名单**
   - 确保当前IP在微信小程序后台的IP白名单中
   - 查看当前IP：`curl ifconfig.me`

3. **域名配置**
   - 微信小程序后台需要配置服务器域名白名单
   - 添加：`https://hfb.yugioh.top`

4. **上传前检查**
   - 确认环境配置正确
   - 确认API地址正确
   - 确认IP白名单已配置

---

## 📚 相关文档

- [生产环境配置指南](.tools/PRODUCTION_SETUP_GUIDE.md)
- [API连接修复指南](.tools/FIX_API_CONNECTION.md)
- [快速参考指南](.tools/QUICK_REFERENCE.md)

---

**最后更新**: 2026-02-27
**版本**: 1.0.20260227.1530
