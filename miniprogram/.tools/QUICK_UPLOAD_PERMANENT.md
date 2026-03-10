# 微信小程序快速上传 - 永久保存配置

## 🚀 已永久配置

私钥文件已永久保存在项目中：
- **路径**: `/workspace/projects/miniprogram/private.key`
- **权限**: 600（安全权限）
- **状态**: ✅ 已配置

## 📝 快速上传命令

### 方式1：使用 npm 脚本（推荐）

```bash
# 进入 miniprogram 目录
cd /workspace/projects/miniprogram

# 自动上传（自动生成版本号）
npm run upload

# 快速上传（同上）
npm run upload:quick
```

### 方式2：使用 Shell 脚本

```bash
# 自动上传（自动生成版本号）
bash /workspace/projects/upload-miniprogram.sh

# 指定版本号和描述
bash /workspace/projects/upload-miniprogram.sh 1.0.20260226.2210 "描述"
```

### 方式3：使用 Node.js 脚本

```bash
# 自动上传（自动生成版本号）
node /workspace/projects/upload-wechat-miniprogram.js

# 指定版本号和描述
node /workspace/projects/upload-wechat-miniprogram.js 1.0.20260226.2210 "描述"
```

## 📋 上传脚本配置

### miniprogram/package.json

已配置以下 npm 脚本：

```json
{
  "scripts": {
    "upload": "bash ../upload-miniprogram.sh",
    "upload:quick": "bash ../upload-miniprogram.sh",
    "upload:version": "node ../upload-wechat-miniprogram.sh"
  }
}
```

## 🔐 私钥文件说明

私钥文件 `private.key` 已永久保存在项目中，无需每次重新配置：

- **位置**: `miniprogram/private.key`
- **权限**: 600（仅所有者可读写）
- **用途**: 微信小程序上传身份验证
- **安全性**: 该文件仅用于上传代码，请勿泄露

## ⚡ 日常使用流程

### 快速上传（最常用）

```bash
cd /workspace/projects/miniprogram
npm run upload
```

### 自定义版本号

```bash
cd /workspace/projects/miniprogram
npm run upload 1.0.20260226.2210 "本次更新内容"
```

## 📌 注意事项

1. **版本号格式**: 建议使用 `1.0.YYYYMMDD.HHMM` 格式
2. **描述**: 简洁明了，不超过 100 字符
3. **私钥安全**: 不要将 `private.key` 提交到公开的 Git 仓库
4. **上传限制**: 每天最多上传 10 次

## 🔄 更新历史

- **1.0.20260226.2200**: 为所有页面添加Mock数据支持
- **1.0.20260226.2152**: 修复TabBar配置错误

---

**现在您可以使用上述任意方式永久快速上传小程序！** 🎉
