# 微信支付域名配置更新完成

## ✅ 已完成的配置

### 1. 更新域名配置

已将以下域名更新为 `hfb.yugioh.top`：

- **授权回调域**：hfb.yugioh.top
- **支付授权目录**：https://hfb.yugioh.top/
- **支付回调地址**：https://hfb.yugioh.top/api/payment/wechat/jsapi/callback
- **支付申请页面**：https://hfb.yugioh.top/payment-application

### 2. 更新的文件

| 文件 | 修改内容 |
|------|----------|
| `.env.local` | 更新回调地址 |
| `src/app/(dynamic)/admin/payment/wechat/page.tsx` | 更新配置说明中的域名 |
| `src/app/(dynamic)/payment-application/page.tsx` | 更新官网地址显示 |

### 3. 新增的文件

| 文件 | 说明 |
|------|------|
| `WECHAT_PAYMENT_CONFIG.md` | 完整的微信支付配置指南 |
| `src/app/(dynamic)/admin/payment/wechat/check/page.tsx` | 配置检查页面 |

---

## ⚠️ 重要：配置 API Key

### API Key 是什么？

API Key（API 密钥）是微信支付用于验证请求签名的密钥，**必须配置才能使用支付功能**。

### 配置步骤（图文详解）

#### 步骤 1：登录微信支付商户平台

1. 打开浏览器，访问：https://pay.weixin.qq.com
2. 使用您的商户账号和密码登录

#### 步骤 2：进入 API 安全设置

登录后，按以下路径操作：

1. 点击顶部菜单的 **"账户中心"**
2. 在左侧菜单中找到并点击 **"API安全"**
3. 在页面中找到 **"API密钥"** 部分

#### 步骤 3：设置 API 密钥

1. 点击 **"设置 API 密钥"** 按钮
2. 系统会提示您输入密钥

#### 步骤 4：输入密钥

**重要要求**：
- 密钥长度必须是 **32位**
- 只能包含 **字母（a-z, A-Z）** 和 **数字（0-9）**
- 不要包含特殊字符
- 设置后 **无法再次查看**，请妥善保管

**示例密钥**（仅供参考，请勿使用）：
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**推荐密钥格式**：
```
AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

#### 步骤 5：确认设置

1. 再次输入密钥以确认
2. 点击 **"确认"** 按钮
3. 系统会提示"API密钥设置成功"

#### 步骤 6：将密钥配置到项目中

**重要**：设置完成后，请立即复制密钥到项目中，因为系统不会再次显示密钥！

1. 打开项目目录下的 `.env.local` 文件
2. 找到这一行：
   ```env
   WECHAT_API_KEY=your_api_key_here
   ```
3. 将 `your_api_key_here` 替换为您刚刚设置的 32 位密钥
4. 保存文件

**配置示例**：
```env
# 替换前
WECHAT_API_KEY=your_api_key_here

# 替换后
WECHAT_API_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

#### 步骤 7：重启服务

配置完成后，需要重启开发服务器：

```bash
# 停止当前服务
pkill -f "next-server"

# 重新启动
coze dev >/app/work/logs/bypass/dev.log 2>&1 &
```

---

## 📋 微信商户平台配置

### 1. 配置授权回调域

**用途**：微信 OAuth 授权登录时使用

**配置步骤**：
1. 登录微信支付商户平台
2. 进入 **"产品中心"** -> **"开发配置"**
3. 找到 **"公众号支付"** 或 **"网页授权"** 部分
4. 在 **"授权回调域"** 中输入：`hfb.yugioh.top`
5. 点击 **"保存"**

### 2. 配置支付授权目录

**用途**：JSAPI 支付时的授权目录

**配置步骤**：
1. 登录微信支付商户平台
2. 进入 **"产品中心"** -> **"开发配置"**
3. 找到 **"JSAPI 支付"** 部分
4. 在 **"支付授权目录"** 中输入：`https://hfb.yugioh.top/`
   - **注意**：必须以 `/` 结尾
   - **注意**：必须包含 `https://`
5. 点击 **"保存"**

### 3. 配置回调域名

**用途**：支付结果通知和退款回调

**配置步骤**：
1. 登录微信支付商户平台
2. 进入 **"产品中心"** -> **"开发配置"**
3. 找到 **"支付结果通知"** 部分
4. 在 **"回调域名"** 中输入：`hfb.yugioh.top`
5. 点击 **"保存"**

### 4. 配置证书（用于退款功能）

如果需要使用退款功能，需要配置证书：

**配置步骤**：
1. 登录微信支付商户平台
2. 进入 **"账户中心"** -> **"API安全"**
3. 找到 **"API证书"** 部分
4. 点击 **"申请证书"**
5. 下载证书文件（apiclient_cert.p12, apiclient_cert.pem, apiclient_key.pem）
6. 将证书文件放到项目的 `certs/wechat/` 目录
7. 如果证书有密码，配置到 `.env.local` 文件中：
   ```env
   WECHAT_CERT_P12_PASSWORD=您的证书密码
   ```

---

## 🔍 配置验证

### 1. 使用配置检查页面

访问以下地址查看配置状态：

**本地开发环境**：
http://localhost:5000/admin/payment/wechat/check

**生产环境**：
https://hfb.yugioh.top/admin/payment/wechat/check

### 2. 使用 API 接口验证

访问以下地址验证配置：

http://localhost:5000/api/payment/wechat/config

**预期结果**：
```json
{
  "success": true,
  "data": {
    "configured": true,
    "missingFields": [],
    "certConfigured": true,
    "certMissing": [],
    "appId": "wx08311***",
    "mchId": "110660***",
    "notifyUrl": "https://hfb.yugioh.top/api/payment/wechat/jsapi/callback"
  }
}
```

### 3. 验证微信商户平台配置

在微信支付商户平台的"开发配置"页面，确认以下配置：
- ✅ 授权回调域：hfb.yugioh.top
- ✅ 支付授权目录：https://hfb.yugioh.top/
- ✅ 回调域名：hfb.yugioh.top

---

## 📖 详细配置文档

完整的配置指南已保存在项目根目录：

**文件位置**：`WECHAT_PAYMENT_CONFIG.md`

**文档内容**：
- API Key 配置步骤（图文详解）
- 微信商户平台配置步骤
- 配置验证方法
- 常见问题解答
- 安全建议
- 配置清单

---

## ✅ 配置清单

请按以下顺序完成配置：

- [ ] 1. 在微信支付商户平台设置 API 密钥（32位）
- [ ] 2. 将 API 密钥配置到 `.env.local` 文件
- [ ] 3. 配置授权回调域：`hfb.yugioh.top`
- [ ] 4. 配置支付授权目录：`https://hfb.yugioh.top/`
- [ ] 5. 配置回调域名：`hfb.yugioh.top`
- [ ] 6. （可选）配置证书（用于退款功能）
- [ ] 7. 重启开发服务器
- [ ] 8. 验证配置：访问 /admin/payment/wechat/check
- [ ] 9. 测试支付流程

---

## 🚀 下一步操作

### 1. 配置 API Key（必需）

按照上方的配置步骤，在微信支付商户平台设置 API 密钥，并将密钥配置到 `.env.local` 文件中。

### 2. 配置微信商户平台

在微信支付商户平台中配置授权回调域、支付授权目录和回调域名。

### 3. 重启服务

配置完成后，重启开发服务器使配置生效。

### 4. 验证配置

访问配置检查页面，确认所有配置项都正确。

### 5. 测试支付流程

创建测试订单，测试支付功能是否正常。

---

## 📞 联系支持

如有问题，请联系：

- **邮箱**：support@yugioh.top
- **微信支付客服**：95017
- **微信支付商户平台**：https://pay.weixin.qq.com

---

## 🔗 重要链接

- **配置检查页面**：http://localhost:5000/admin/payment/wechat/check
- **配置管理页面**：http://localhost:5000/admin/payment/wechat
- **配置文档**：/WECHAT_PAYMENT_CONFIG.md
- **微信支付商户平台**：https://pay.weixin.qq.com

---

## ⚠️ 重要提示

1. **API 密钥只能重置，无法查看**，请妥善保管。
2. **支付授权目录必须以 `/` 结尾**。
3. **配置后可能需要等待 5-10 分钟才能生效**。
4. **不要将 `.env.local` 文件提交到版本控制系统**。
5. **定期更换密钥**（建议每 3-6 个月）。

---

## 📌 当前配置信息

| 配置项 | 值 |
|--------|-----|
| APPID | wx0831611146088354 |
| 商户号 | 1106605743 |
| 授权回调域 | hfb.yugioh.top |
| 支付授权目录 | https://hfb.yugioh.top/ |
| 回调域名 | hfb.yugioh.top |
| 支付回调地址 | https://hfb.yugioh.top/api/payment/wechat/jsapi/callback |

---

配置更新完成！请按照上述步骤完成 API Key 配置和微信商户平台配置。
