# 微信小程序上传工具 - 快速选择指南

## 🎯 快速选择

### 我想要最简单的方式

→ 使用 `quick-upload.sh`

```bash
./quick-upload.sh
```

**特点**：
- ✅ 最简单，一行命令
- ✅ 自动读取版本号
- ✅ 彩色输出

**详细说明**：[QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

### 我想要在 Windows 上使用

→ 使用 `scripts/upload-miniprogram.js`

```bash
node scripts/upload-miniprogram.js [版本号] [描述]
```

**特点**：
- ✅ 跨平台支持
- ✅ 跨平台（Linux/Mac/Windows）
- ✅ 详细错误提示

**详细说明**：[TOOLS_INDEX.md](TOOLS_INDEX.md)

---

### 我想要完整的错误处理和进度显示

→ 使用 `miniprogram/upload-safe.js`

```bash
cd miniprogram
node upload-safe.js [版本号] [描述]
```

**特点**：
- ✅ 完整的错误处理
- ✅ 详细的进度显示
- ✅ 安全性高

**详细说明**：[UPLOAD_TOOLS_COMPARISON.md](UPLOAD_TOOLS_COMPARISON.md)

---

### 我想要最快的 Node.js 方式

→ 使用 `miniprogram/upload-quick.js`

```bash
cd miniprogram
node upload-quick.js [版本号] [描述]
```

**特点**：
- ✅ 简洁快速
- ✅ 自动生成版本号
- ✅ 跨平台支持

---

## 📊 完整对比

| 工具 | 推荐度 | 平台 | 复杂度 | 文件 |
|------|--------|------|--------|------|
| quick-upload.sh | ⭐⭐⭐⭐⭐ | Linux/Mac | 低 | [quick-upload.sh](quick-upload.sh) |
| upload-quick.js | ⭐⭐⭐⭐ | 全平台 | 低 | [miniprogram/upload-quick.js](miniprogram/upload-quick.js) |
| upload-safe.js | ⭐⭐⭐⭐ | 全平台 | 中 | [miniprogram/upload-safe.js](miniprogram/upload-safe.js) |
| upload-miniprogram.js | ⭐⭐⭐⭐ | 全平台 | 中 | [scripts/upload-miniprogram.js](scripts/upload-miniprogram.js) |

**完整对比**：[UPLOAD_TOOLS_COMPARISON.md](UPLOAD_TOOLS_COMPARISON.md)

---

## 🚀 快速开始

### 第一次使用

1. **配置私钥**
   ```bash
   # 下载私钥后，放到 miniprogram/ 目录
   chmod 600 miniprogram/private.key
   ```

2. **测试上传**
   ```bash
   ./quick-upload.sh
   ```

3. **提交审核**
   - 登录：https://mp.weixin.qq.com/
   - 进入：版本管理
   - 找到对应版本
   - 点击"提交审核"

详细配置说明：[AUTO_UPLOAD_CONFIG.md](AUTO_UPLOAD_CONFIG.md)

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [UPLOAD_TOOLS_COMPARISON.md](UPLOAD_TOOLS_COMPARISON.md) | 所有上传工具的完整对比 ⭐ |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 快速参考指南 |
| [TOOLS_INDEX.md](TOOLS_INDEX.md) | 工具索引 |
| [UPLOAD_GUIDE.md](UPLOAD_GUIDE.md) | 详细上传指南 |
| [AUTO_UPLOAD_CONFIG.md](AUTO_UPLOAD_CONFIG.md) | 自动上传配置 |

---

**最后更新**: 2026/2/26 21:45
