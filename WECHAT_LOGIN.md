# 微信登录功能说明

## 功能概述

已成功实装微信登录功能，用户可以通过微信授权快速登录和注册账号。

## 配置信息

### 环境变量配置 (.env.local)

```
WECHAT_APPID=wx0831611146088354
WECHAT_APPSECRET=59dddd04e2a748379f32b73f88e63527
WECHAT_REDIRECT_URI=https://hfb.yugioh.top/api/auth/wechat/callback
```

### 微信开放平台配置

- **授权回调域**: hfb.yugioh.top
- **APPID**: wx0831611146088354
- **AppSecret**: 59dddd04e2a748379f32b73f88e63527

## 功能流程

### 1. 用户点击微信登录

**前端**: `src/components/LoginDialog.tsx`
- 用户点击"微信登录"按钮
- 跳转到 `/api/auth/wechat/authorize?state=login`

**后端**: `src/app/api/auth/wechat/authorize/route.ts`
- 生成微信OAuth授权URL
- 重定向到微信授权页面

### 2. 微信授权

- 用户在微信页面扫码或确认授权
- 微信重定向回调到 `https://hfb.yugioh.top/api/auth/wechat/callback?code=xxx&state=login`

### 3. 处理微信回调

**后端**: `src/app/api/auth/wechat/callback/route.ts`
- 通过code获取access_token和openid
- 通过access_token获取用户信息（昵称、头像等）
- 设置临时cookie存储微信用户信息（5分钟有效期）
- 重定向到首页

### 4. 绑定手机号

**前端**: `src/app/(dynamic)/page.tsx`
- 首页检测到微信临时cookie
- 显示"微信绑定手机号"对话框

**组件**: `src/components/WechatBindDialog.tsx`
- 显示微信用户信息（昵称、头像）
- 引导用户输入手机号和验证码
- 提交绑定请求到 `/api/auth`

**后端**: `src/app/api/auth/route.ts` (action: 'wechat-bind-phone')
- 验证手机号验证码
- 检查手机号是否已注册
  - 已注册：绑定微信openid
  - 未注册：创建新用户并绑定微信
- 生成登录token并设置cookie

## 核心文件

### 后端文件

1. **微信OAuth服务**: `src/lib/wechat-oauth.ts`
   - `generateWechatAuthUrl()` - 生成授权URL
   - `wechatLogin()` - 通过code获取用户信息

2. **用户服务**: `src/lib/user-service.ts`
   - `wechatBindPhone()` - 微信绑定手机号

3. **API路由**:
   - `src/app/api/auth/wechat/authorize/route.ts` - 微信授权
   - `src/app/api/auth/wechat/callback/route.ts` - 微信回调
   - `src/app/api/auth/route.ts` - 绑定手机号处理

### 前端文件

1. **登录对话框**: `src/components/LoginDialog.tsx`
   - 修改微信登录按钮为跳转逻辑

2. **微信绑定对话框**: `src/components/WechatBindDialog.tsx`
   - 新建组件，处理手机号绑定流程

3. **首页**: `src/app/(dynamic)/page.tsx`
   - 检测微信回调cookie
   - 显示绑定对话框

## 使用示例

### 开发环境测试

1. 启动项目后，点击登录按钮
2. 选择"微信登录"标签
3. 点击"微信登录"按钮
4. 会跳转到微信授权页面（需要微信开放平台已配置测试号）
5. 授权后会返回网站，引导绑定手机号

### 生产环境

1. 确保微信开放平台已配置正确的授权回调域
2. 确保域名已备案（微信要求）
3. 用户扫码授权后，自动绑定手机号完成登录

## 注意事项

1. **Cookie有效期**: 微信临时cookie有效期为5分钟，超时需重新授权
2. **手机号绑定**: 所有微信登录都需要绑定手机号，确保账号安全
3. **账号关联**: 同一手机号可以绑定多个微信openid（当前逻辑）
4. **安全性**: AppSecret已配置，请勿泄露

## 后续优化建议

1. 支持微信一键登录（无需输入验证码，直接获取手机号）
2. 支持微信账号解绑
3. 支持多个微信账号绑定同一手机号
4. 添加微信登录日志记录

## 故障排查

### 微信授权失败
- 检查APPID和AppSecret是否正确
- 检查授权回调域是否配置正确
- 检查域名是否已备案

### 绑定手机号失败
- 检查验证码是否正确
- 检查手机号格式是否正确
- 检查后端日志查看具体错误

### Cookie丢失
- 检查浏览器是否禁用cookie
- 检查SSL证书是否正确（微信回调要求HTTPS）
