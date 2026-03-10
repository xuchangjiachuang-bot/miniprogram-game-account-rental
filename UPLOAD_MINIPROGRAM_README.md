# 微信小程序永久上传工具

本工具用于永久保存微信小程序上传脚本，方便随时使用。

## 🚀 快速使用

### 方式1：使用 Shell 脚本（最简单）⭐

```bash
# 自动上传（自动生成版本号）
./upload-miniprogram.sh

# 指定版本号
./upload-miniprogram.sh 1.0.20260226.2152

# 指定版本号和描述
./upload-miniprogram.sh 1.0.20260226.2152 "修复TabBar配置错误"
```

### 方式2：使用 Node.js 脚本

```bash
# 自动上传（自动生成版本号）
node upload-wechat-miniprogram.js

# 指定版本号
node upload-wechat-miniprogram.js 1.0.20260226.2152

# 指定版本号和描述
node upload-wechat-miniprogram.js 1.0.20260226.2152 "修复TabBar配置错误"
```

---

## 🔧 首次使用配置

### 1. 获取私钥

1. 登录微信小程序后台：https://mp.weixin.qq.com/
2. 进入：**开发** -> **开发管理** -> **开发设置**
3. 找到"**小程序代码上传**"部分
4. 点击"**生成**"或"**重置**"私钥
5. 下载私钥文件（通常命名为 `private.key`）

### 2. 放置私钥文件

```bash
# 将私钥文件复制到 miniprogram 目录
cp /path/to/private.key miniprogram/private.key

# 设置文件权限（Linux/Mac）
chmod 600 miniprogram/private.key
```

### 3. 验证配置

```bash
# 检查私钥文件
ls -la miniprogram/private.key

# 测试上传
./upload-miniprogram.sh
```

---

## 📖 详细文档

| 文档 | 说明 |
|------|------|
| [UPLOAD_WECHAT_GUIDE.md](UPLOAD_WECHAT_GUIDE.md) | 永久上传脚本使用指南 ⭐ |
| [UPLOAD_TOOLS_COMPARISON.md](UPLOAD_TOOLS_COMPARISON.md) | 所有上传工具的对比 |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 快速参考指南 |
| [UPLOAD_GUIDE.md](UPLOAD_GUIDE.md) | 上传指南 |

---

## 📁 文件说明

### 上传脚本

| 文件 | 类型 | 说明 |
|------|------|------|
| `upload-miniprogram.sh` | Shell | 快速上传脚本 ⭐ |
| `upload-wechat-miniprogram.js` | Node.js | 永久上传脚本 |

### 文档

| 文件 | 说明 |
|------|------|
| `UPLOAD_WECHAT_GUIDE.md` | 详细使用指南 |
| `UPLOAD_TOOLS_COMPARISON.md` | 工具对比 |
| `QUICK_REFERENCE.md` | 快速参考 |

---

## 🎯 日常使用流程

```bash
# 1. 修复代码或开发新功能
# （编辑代码文件）

# 2. 更新 CHANGELOG.md
# 编辑 CHANGELOG.md

# 3. 上传到微信平台
./upload-miniprogram.sh

# 4. 提交审核
# 登录 https://mp.weixin.qq.com/
# 进入版本管理，提交审核
```

---

## 🔍 故障排除

### 问题1：找不到私钥文件

```bash
# 检查私钥文件
ls -la miniprogram/private.key

# 如果不存在，重新配置
cp /path/to/private.key miniprogram/private.key
chmod 600 miniprogram/private.key
```

### 问题2：权限不安全

```bash
# 设置正确权限
chmod 600 miniprogram/private.key
```

### 问题3：上传失败

- 查看 UPLOAD_WECHAT_GUIDE.md 的"故障排除"部分
- 确认 IP 白名单已配置
- 等待 5-10 分钟后重试

---

## ⚙️ 配置

### 环境变量

```bash
# 设置私钥路径（可选）
export MINIPROGRAM_PRIVATE_KEY_PATH=/path/to/private.key

# 使用
./upload-miniprogram.sh
```

### 默认配置

- **AppID**: `wx2382e1949d031ba6`
- **项目路径**: `miniprogram/`
- **私钥路径**: `miniprogram/private.key`

---

## 🔒 安全建议

1. **不要提交私钥到 Git**
   - 已添加到 `.gitignore`
   - 确保 `private.key` 不会被提交

2. **设置正确权限**
   ```bash
   chmod 600 miniprogram/private.key
   ```

3. **定期更换私钥**
   - 建议每6个月更换一次
   - 在微信小程序后台重置

---

## 📞 获取帮助

- 查看详细指南：[UPLOAD_WECHAT_GUIDE.md](UPLOAD_WECHAT_GUIDE.md)
- 查看快速参考：[QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- 查看版本日志：[CHANGELOG.md](CHANGELOG.md)

---

**最后更新**: 2026/2/26 21:55
**版本**: 1.0.0
