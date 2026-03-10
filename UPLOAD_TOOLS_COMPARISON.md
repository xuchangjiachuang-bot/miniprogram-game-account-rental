# 微信小程序上传工具汇总

## 📊 工具对比

| 工具 | 文件位置 | 推荐度 | 安全性 | 说明 |
|------|---------|--------|--------|------|
| **快速上传脚本** | `quick-upload.sh` | ⭐⭐⭐⭐⭐ | ✅ 高 | Shell 脚本，最推荐 |
| **快速上传（Node.js）** | `miniprogram/upload-quick.js` | ⭐⭐⭐⭐ | ✅ 高 | 简化版 Node.js 脚本 |
| **安全上传脚本** | `miniprogram/upload-safe.js` | ⭐⭐⭐⭐ | ✅ 高 | 完整版 Node.js 脚本 |
| **Node.js 上传脚本** | `scripts/upload-miniprogram.js` | ⭐⭐⭐⭐ | ✅ 高 | 跨平台支持 |
| **原始上传脚本** | `miniprogram/upload-original-unsafe.js` | ❌ | ⚠️ 低 | 包含硬编码私钥，不推荐 |

---

## 🚀 推荐使用

### 1. 快速上传脚本（最推荐）⭐⭐⭐⭐⭐

**文件位置**：`quick-upload.sh`

**使用方法**：
```bash
./quick-upload.sh [版本号] [描述]

# 示例
./quick-upload.sh
./quick-upload.sh 1.0.20260226.2137 "修复TabBar配置错误"
```

**优点**：
- ✅ 最简单，一行命令搞定
- ✅ 自动从 CHANGELOG.md 读取版本
- ✅ 彩色输出，清晰易读
- ✅ 自动检查配置
- ✅ 安全性高（私钥独立文件）

**详细说明**：见 [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

### 2. 快速上传（Node.js）⭐⭐⭐⭐

**文件位置**：`miniprogram/upload-quick.js`

**使用方法**：
```bash
# 进入小程序目录
cd miniprogram

# 使用方法
node upload-quick.js [版本号] [描述]

# 示例
node upload-quick.js
node upload-quick.js 1.0.20260226.2137 "修复TabBar配置错误"
```

**优点**：
- ✅ 简洁快速
- ✅ 自动生成版本号
- ✅ 安全性高（私钥独立文件）
- ✅ 跨平台支持

---

### 3. 安全上传脚本⭐⭐⭐⭐

**文件位置**：`miniprogram/upload-safe.js`

**使用方法**：
```bash
# 进入小程序目录
cd miniprogram

# 使用方法
node upload-safe.js [版本号] [描述]

# 示例
node upload-safe.js
node upload-safe.js 1.0.20260226.2137 "修复TabBar配置错误"
```

**优点**：
- ✅ 完整的错误处理
- ✅ 详细的进度显示
- ✅ 详细的检查和验证
- ✅ 安全性高（私钥独立文件）
- ✅ 友好的错误提示

---

### 4. Node.js 上传脚本⭐⭐⭐⭐

**文件位置**：`scripts/upload-miniprogram.js`

**使用方法**：
```bash
# 使用方法
node scripts/upload-miniprogram.js [版本号] [描述]

# 示例
node scripts/upload-miniprogram.js 1.0.20260226.2137 "修复TabBar配置错误"
```

**优点**：
- ✅ 跨平台支持（Linux/Mac/Windows）
- ✅ 自动从 CHANGELOG.md 读取版本
- ✅ 详细的错误提示
- ✅ 可集成到 CI/CD

**详细说明**：见 [TOOLS_INDEX.md](TOOLS_INDEX.md)

---

## ❌ 不推荐使用

### 原始上传脚本（不安全）

**文件位置**：`miniprogram/upload-original-unsafe.js`

**为什么不推荐**：
- ❌ 私钥硬编码在脚本中（严重安全风险）
- ❌ AppID 错误（已修正）
- ❌ 已被重命名，仅作参考

**已迁移到**：`miniprogram/upload-safe.js`（安全版本）

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
   # 方式1：放到 miniprogram 目录（推荐）
   cp /path/to/private.key /workspace/projects/miniprogram/
   chmod 600 /workspace/projects/miniprogram/private.key

   # 方式2：放到项目根目录
   cp /path/to/private.key /workspace/projects/
   chmod 600 /workspace/projects/private.key
   ```

3. **使用环境变量（可选）**
   ```bash
   export MINIPROGRAM_PRIVATE_KEY_PATH=/path/to/private.key
   ```

---

## 📝 历史记录

### 之前成功上传的版本

| 版本 | 日期 | 上传工具 | 状态 |
|------|------|---------|------|
| 1.0.20260226.2133 | 2026/2/26 21:33 | upload-original-unsafe.js | ✅ 成功 |
| 1.0.20260226.2137 | 2026/2/26 21:37 | 未自动上传（手动） | ✅ 成功 |

### 版本详情

#### 版本 1.0.20260226.2133
- **上传时间**: 2026/2/26 21:33
- **上传工具**: `upload-original-unsafe.js`（已重命名为 `upload-original-unsafe.js`）
- **上传方式**: 手动在微信开发者工具中上传
- **状态**: ✅ 成功

#### 版本 1.0.20260226.2137
- **上传时间**: 2026/2/26 21:37
- **上传方式**: 手动在微信开发者工具中上传
- **状态**: ✅ 成功

---

## 🎯 下次更新时

### 使用快速上传脚本（推荐）

```bash
# 1. 修复代码
# （编辑代码文件）

# 2. 更新 CHANGELOG.md
# 编辑 CHANGELOG.md

# 3. 快速上传（一行命令搞定）
./quick-upload.sh

# 4. 提交审核
# 登录 https://mp.weixin.qq.com/
```

---

## 📞 帮助文档

| 文档 | 说明 |
|------|------|
| [UPLOAD_TOOLS_SUMMARY.md](UPLOAD_TOOLS_SUMMARY.md) | 上传工具摘要 |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 快速参考指南 |
| [TOOLS_INDEX.md](TOOLS_INDEX.md) | 工具索引 |
| [COMMANDS.md](COMMANDS.md) | 常用命令速查 |
| [UPLOAD_GUIDE.md](UPLOAD_GUIDE.md) | 详细上传指南 |
| [AUTO_UPLOAD_CONFIG.md](AUTO_UPLOAD_CONFIG.md) | 自动上传配置 |

---

## 🔍 故障排除

### 常见问题

#### 1. 找不到私钥文件

**错误**：
```
❌ 私钥文件不存在
```

**解决方案**：
1. 登录微信小程序后台获取私钥
2. 放置到 `miniprogram/private.key`
3. 设置权限：`chmod 600 miniprogram/private.key`

#### 2. 上传失败

**错误**：
```
❌ 上传失败
```

**解决方案**：
1. 检查 AppID 是否正确（应该是 `wx2382e1949d031ba6`）
2. 检查私钥文件是否有效
3. 检查网络连接
4. 检查 IP 白名单是否生效

#### 3. 权限不安全

**警告**：
```
⚠️ 私钥文件权限不安全
```

**解决方案**：
```bash
chmod 600 miniprogram/private.key
```

---

**最后更新**: 2026/2/26 21:45
