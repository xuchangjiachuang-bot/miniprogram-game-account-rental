# 微信支付证书信息提取报告

## 证书基本信息

### 证书文件
- **原始文件**: `certs/wechat/apiclient_cert.p12`
- **文件大小**: 2774 字节
- **密码**: `1106605743` (商户号)

### 证书序列号
```
15FCE18FC26A4A9530CDADDC5FC2FDB10499F06B
```

**长度**: 40 位（16字节）

### 有效期
- **生效时间**: 2026-02-24 08:36:11
- **失效时间**: 2031-02-23 08:36:11
- **有效天数**: 1825 天（5年）

### 证书颁发者
```
C = CN
O = Tenpay.com
OU = Tenpay.com CA Center
CN = Tenpay.com Root CA
```

### 证书主题（商户信息）
```
CN = 1106605743
O = 微信商户系统
OU = 许昌壹鸣网络技术有限公司
C = CN
L = ShenZhen
```

### 公钥信息
- **密钥类型**: RSA
- **密钥长度**: 2048 位

### 签名算法
- **算法**: sha256WithRSAEncryption

---

## 证书转换

### 已转换文件

1. **证书文件**: `certs/wechat/apiclient_cert.pem`
   - 格式: PEM
   - 包含: 公钥证书

2. **私钥文件**: `certs/wechat/apiclient_key.pem`
   - 格式: PEM
   - 包含: 私钥（未加密）
   - ⚠️ **注意**: 私钥文件不应提交到版本控制系统

### 验证命令

```bash
# 验证证书文件
openssl x509 -in certs/wechat/apiclient_cert.pem -noout -text

# 验证私钥文件
openssl rsa -in certs/wechat/apiclient_key.pem -check

# 查看证书序列号
openssl x509 -in certs/wechat/apiclient_cert.pem -noout -serial
```

---

## 环境变量配置

### 已配置的环境变量

```env
# 微信支付配置
WECHAT_APPID=wx0831611146088354
WECHAT_MCH_ID=1106605743
WECHAT_API_KEY=your_api_key_here
WECHAT_NOTIFY_URL=https://hfb.yugioh.top/api/payment/wechat/jsapi/callback

# 证书配置（自动配置，无需手动设置）
# WECHAT_CERT_P12_PATH=certs/wechat/apiclient_cert.p12
# WECHAT_CERT_PATH=certs/wechat/apiclient_cert.pem
# WECHAT_KEY_PATH=certs/wechat/apiclient_key.pem
# WECHAT_CERT_P12_PASSWORD=1106605743
```

### 配置说明

1. **证书路径**
   - `.p12` 文件: `certs/wechat/apiclient_cert.p12`
   - `.pem` 证书: `certs/wechat/apiclient_cert.pem`
   - `.pem` 私钥: `certs/wechat/apiclient_key.pem`

2. **证书密码**
   - 密码就是商户号: `1106605743`
   - 代码中已自动配置

3. **优先级**
   - 优先使用 `.p12` 文件
   - 如果 `.p12` 文件不存在，使用 `.pem` 文件

---

## 使用场景

### 1. 支付退款
微信支付退款功能需要使用证书进行双向认证。

### 2. API 调用验证
某些微信支付 API 调用时需要提供证书序列号进行验证。

### 3. 证书管理
用于证书的有效性验证和证书更新提醒。

---

## 安全注意事项

### ⚠️ 重要提醒

1. **私钥安全**
   - 私钥文件 (`apiclient_key.pem`) 包含敏感信息
   - 不要提交到版本控制系统
   - 不要在公开场合泄露

2. **证书密码**
   - 证书密码是商户号，相对安全
   - 但仍需妥善保管

3. **证书有效期**
   - 证书有效期到 2031-02-23
   - 到期前需要更新证书
   - 建议在到期前 3 个月更新

4. **备份建议**
   - 定期备份证书文件
   - 保存到安全的地方
   - 记录证书序列号

---

## 配置验证

### 1. 验证证书文件

```bash
# 检查证书文件是否存在
ls -lh certs/wechat/apiclient_cert.p12
ls -lh certs/wechat/apiclient_cert.pem
ls -lh certs/wechat/apiclient_key.pem
```

### 2. 验证证书有效性

```bash
# 检查证书是否在有效期内
openssl x509 -in certs/wechat/apiclient_cert.pem -noout -checkend 0

# 检查证书序列号
openssl x509 -in certs/wechat/apiclient_cert.pem -noout -serial
```

### 3. 测试退款功能

在管理后台或测试环境中测试退款功能，验证证书是否正确配置。

---

## 证书更新流程

### 1. 下载新证书
- 登录微信支付商户平台
- 进入"账户中心" → "API安全"
- 下载新的证书文件

### 2. 替换证书文件
```bash
# 备份旧证书
mv certs/wechat/apiclient_cert.p12 certs/wechat/apiclient_cert.p12.backup
mv certs/wechat/apiclient_cert.pem certs/wechat/apiclient_cert.pem.backup
mv certs/wechat/apiclient_key.pem certs/wechat/apiclient_key.pem.backup

# 复制新证书
cp new_cert.p12 certs/wechat/apiclient_cert.p12
```

### 3. 转换证书格式
```bash
# 运行提取脚本
python3 extract_cert_full.py
```

### 4. 更新数据库配置
在管理后台更新微信支付配置。

### 5. 测试验证
测试退款功能，确认新证书正常工作。

---

## 常见问题

### Q1: 证书密码是什么？

**A**: 证书密码通常是商户号：`1106605743`

### Q2: 证书序列号在哪里使用？

**A**:
- 退款 API 调用时需要提供
- 证书验证时使用
- 微信支付商户平台查看证书详情

### Q3: 证书快过期了怎么办？

**A**:
- 在到期前 3 个月登录微信支付商户平台
- 申请更新证书
- 按照证书更新流程操作

### Q4: 为什么需要转换证书格式？

**A**:
- `.p12` 格式包含私钥和证书
- `.pem` 格式更通用，便于处理
- 代码中更方便使用

### Q5: 可以同时使用 .p12 和 .pem 格式吗？

**A**: 可以，代码会优先使用 `.p12` 文件，如果不存在则使用 `.pem` 文件。

---

## 总结

### 证书信息摘要

| 项目 | 值 |
|------|-----|
| 证书序列号 | `15FCE18FC26A4A9530CDADDC5FC2FDB10499F06B` |
| 商户号 | `1106605743` |
| 证书密码 | `1106605743` |
| 有效期 | 2026-02-24 至 2031-02-23 |
| 有效天数 | 1825 天（5年） |
| 公钥长度 | 2048 位 |
| 签名算法 | sha256WithRSAEncryption |

### 配置文件状态

- ✅ `certs/wechat/apiclient_cert.p12` - 已下载
- ✅ `certs/wechat/apiclient_cert.pem` - 已转换
- ✅ `certs/wechat/apiclient_key.pem` - 已转换

### 下一步操作

1. ✅ 证书文件已就绪
2. ⏳ 配置 API Key（见文档）
3. ⏳ 配置微信支付商户平台
4. ⏳ 测试支付功能
5. ⏳ 测试退款功能

---

**提取时间**: 2024年
**提取工具**: Python cryptography 库
**证书状态**: 正常，未过期
