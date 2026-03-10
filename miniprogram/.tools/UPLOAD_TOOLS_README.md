# 微信小程序上传工具

本目录包含微信小程序源码和上传工具。

## 🚀 上传工具

### 推荐使用

| 工具 | 说明 |
|------|------|
| **upload-quick.js** | 快速上传工具，简洁高效 ⭐ |
| **upload-safe.js** | 安全上传工具，完整错误处理 |

### 不推荐使用

| 工具 | 说明 |
|------|------|
| upload-original-unsafe.js | 原始上传工具，私钥硬编码，安全风险 ⚠️ |

---

## 📖 使用方法

### 快速上传

```bash
# 自动生成版本号
node upload-quick.js

# 指定版本号
node upload-quick.js 1.0.20260226.2137

# 指定版本号和描述
node upload-quick.js 1.0.20260226.2137 "修复TabBar配置错误"
```

### 安全上传

```bash
# 自动生成版本号
node upload-safe.js

# 指定版本号
node upload-safe.js 1.0.20260226.2137

# 指定版本号和描述
node upload-safe.js 1.0.20260226.2137 "修复TabBar配置错误"
```

---

## 🔧 配置私钥

### 步骤

1. **获取私钥**
   - 登录微信小程序后台：https://mp.weixin.qq.com/
   - 进入：开发 -> 开发管理 -> 开发设置
   - 找到"小程序代码上传"部分
   - 点击"生成"或"重置"私钥
   - 下载私钥文件（通常命名为 `private.key`）

2. **放置私钥**
   ```bash
   # 放置到本目录
   cp /path/to/private.key private.key

   # 设置权限（Linux/Mac）
   chmod 600 private.key
   ```

3. **使用环境变量（可选）**
   ```bash
   export MINIPROGRAM_PRIVATE_KEY_PATH=/path/to/private.key
   ```

---

## 📚 详细文档

| 文档 | 说明 |
|------|------|
| [../../UPLOAD_TOOLS_COMPARISON.md](../UPLOAD_TOOLS_COMPARISON.md) | 所有上传工具的完整对比 ⭐ |
| [../../UPLOAD_TOOLS_GUIDE.md](../UPLOAD_TOOLS_GUIDE.md) | 快速选择指南 |
| [../../QUICK_REFERENCE.md](../QUICK_REFERENCE.md) | 快速参考指南 |
| [../../AUTO_UPLOAD_CONFIG.md](../AUTO_UPLOAD_CONFIG.md) | 自动上传配置 |

---

## ⚙️ 项目配置

### project.config.json

```json
{
  "appid": "wx2382e1949d031ba6",
  "projectname": "游戏账号租赁平台",
  ...
}
```

### app.json

```json
{
  "pages": [...],
  "window": {...},
  "tabBar": {...}
}
```

---

**最后更新**: 2026/2/26 21:45
