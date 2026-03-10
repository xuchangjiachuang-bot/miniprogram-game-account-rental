# 微信小程序上传工具 - 永久版使用指南

## 🚀 快速开始

### 第一步：配置私钥

#### 1. 获取私钥

1. 登录微信小程序后台：https://mp.weixin.qq.com/
2. 进入：**开发** -> **开发管理** -> **开发设置**
3. 找到"**小程序代码上传**"部分
4. 点击"**生成**"或"**重置**"私钥
5. 下载私钥文件（通常命名为 `private.key`）

#### 2. 放置私钥文件

```bash
# 将私钥文件复制到 miniprogram 目录
cp /path/to/private.key /workspace/projects/miniprogram/private.key

# 设置文件权限（Linux/Mac）
chmod 600 /workspace/projects/miniprogram/private.key
```

#### 3. 验证配置

```bash
# 检查私钥文件是否存在
ls -la /workspace/projects/miniprogram/private.key

# 检查文件权限
stat -c "%a" /workspace/projects/miniprogram/private.key  # Linux
stat -f "%A" /workspace/projects/miniprogram/private.key  # Mac
```

---

### 第二步：使用上传脚本

#### 基本用法

```bash
# 进入项目目录
cd /workspace/projects

# 自动生成版本号和描述
node upload-wechat-miniprogram.js
```

#### 指定版本号

```bash
# 指定版本号
node upload-wechat-miniprogram.js 1.0.20260226.2152

# 指定版本号和描述
node upload-wechat-miniprogram.js 1.0.20260226.2152 "修复TabBar配置错误"
```

#### 使用环境变量（可选）

```bash
# 设置私钥路径环境变量
export MINIPROGRAM_PRIVATE_KEY_PATH=/path/to/private.key

# 上传
node upload-wechat-miniprogram.js
```

---

## 📝 使用示例

### 示例1：自动上传（推荐）

```bash
# 一行命令搞定
node upload-wechat-miniprogram.js
```

**特点**：
- ✅ 自动生成版本号
- ✅ 自动从 CHANGELOG.md 读取描述
- ✅ 最简单的方式

### 示例2：指定版本号

```bash
# 指定版本号
node upload-wechat-miniprogram.js 1.0.20260226.2152
```

**特点**：
- ✅ 手动指定版本号
- ✅ 自动读取描述

### 示例3：指定版本号和描述

```bash
# 指定版本号和描述
node upload-wechat-miniprogram.js 1.0.20260226.2152 "修复TabBar配置错误"
```

**特点**：
- ✅ 完全控制版本和描述
- ✅ 适合发布重要更新

---

## 🔧 配置说明

### 默认配置

```javascript
{
  appid: 'wx2382e1949d031ba6',
  type: 'miniProgram',
  projectPath: '/workspace/projects/miniprogram',
  privateKeyPath: '/workspace/projects/miniprogram/private.key',
  ignores: [...]
}
```

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `MINIPROGRAM_PRIVATE_KEY_PATH` | 私钥文件路径 | `miniprogram/private.key` |

### 忽略文件

默认忽略以下文件和目录：
- `node_modules/**`
- `.git/**`
- `*.md`
- `upload-*.js`
- `diagnose*.js`
- `check-*.js`
- `solve-*.js`
- `ip-*.js`
- `multi-*.js`

---

## 📋 完整工作流

### 日常开发流程

```bash
# 1. 修复代码或开发新功能
# （编辑代码文件）

# 2. 更新 CHANGELOG.md
# 编辑 CHANGELOG.md，添加新版本信息

# 3. 测试小程序
# 在微信开发者工具中测试

# 4. 上传到微信平台
node upload-wechat-miniprogram.js

# 5. 提交审核
# 登录 https://mp.weixin.qq.com/
# 进入版本管理，提交审核
```

### 紧急修复流程

```bash
# 1. 快速修复问题
# （修复代码）

# 2. 指定版本号和描述
node upload-wechat-miniprogram.js 1.0.20260226.2152 "紧急修复：首页加载失败"

# 3. 提交审核
# 登录微信小程序后台，提交审核
```

---

## 🔍 故障排除

### 问题1：找不到私钥文件

**错误信息**：
```
❌ 私钥文件不存在
```

**解决方案**：
```bash
# 1. 确认私钥文件存在
ls -la /workspace/projects/miniprogram/private.key

# 2. 如果不存在，重新下载并放置
cp /path/to/private.key /workspace/projects/miniprogram/private.key

# 3. 设置权限
chmod 600 /workspace/projects/miniprogram/private.key
```

### 问题2：权限不安全

**警告信息**：
```
⚠️ 私钥文件权限不安全（当前: 644，建议: 600）
```

**解决方案**：
```bash
chmod 600 /workspace/projects/miniprogram/private.key
```

### 问题3：上传失败

**错误信息**：
```
❌ 上传失败
错误信息: ...
错误代码: ...
```

**可能原因**：
1. IP白名单还没有生效（可能需要等待5-10分钟）
2. 私钥文件格式不正确
3. 网络连接问题
4. 微信服务器暂时不可用

**解决方案**：
```bash
# 1. 等待5-10分钟后重试
node upload-wechat-miniprogram.js

# 2. 检查私钥文件
cat /workspace/projects/miniprogram/private.key

# 3. 检查网络连接
ping servicewechat.com

# 4. 联系微信技术支持
```

### 问题4：项目路径不存在

**错误信息**：
```
❌ 项目路径不存在: /workspace/projects/miniprogram
```

**解决方案**：
```bash
# 确认项目路径正确
ls -la /workspace/projects/miniprogram

# 如果路径不对，修改脚本中的 projectPath 配置
# 或者使用环境变量
```

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [UPLOAD_TOOLS_COMPARISON.md](UPLOAD_TOOLS_COMPARISON.md) | 所有上传工具的完整对比 |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 快速参考指南 |
| [CHANGELOG.md](CHANGELOG.md) | 版本更新日志 |
| [README.md](README.md) | 项目说明 |

---

## 🔒 安全建议

### 私钥文件安全

1. **不要提交到 Git**
   - 已添加到 `.gitignore`
   - 确保 `private.key` 不会被提交

2. **设置正确权限**
   ```bash
   chmod 600 miniprogram/private.key
   ```

3. **定期更换**
   - 建议定期在微信小程序后台重置私钥
   - 至少每6个月更换一次

4. **安全存储**
   - 不要将私钥文件放在公开位置
   - 使用环境变量指定私钥路径（可选）

### 网络安全

1. **IP白名单**
   - 确保在微信小程序后台配置了IP白名单
   - 等待5-10分钟让白名单生效

2. **HTTPS**
   - 使用 HTTPS 协议上传
   - 避免在不安全的网络环境下操作

---

## 🎯 快速参考

| 任务 | 命令 |
|------|------|
| 自动上传 | `node upload-wechat-miniprogram.js` |
| 指定版本 | `node upload-wechat-miniprogram.js 1.0.20260226.2152` |
| 检查私钥 | `ls -la miniprogram/private.key` |
| 设置权限 | `chmod 600 miniprogram/private.key` |
| 查看版本 | `head -20 CHANGELOG.md` |

---

## 📞 获取帮助

### 查看帮助

```bash
# 查看使用指南
cat UPLOAD_WECHAT_GUIDE.md

# 查看快速参考
cat QUICK_REFERENCE.md

# 查看版本日志
cat CHANGELOG.md
```

### 联系支持

如果遇到问题：
1. 查看本文档的"故障排除"部分
2. 查看微信小程序官方文档
3. 联系微信技术支持

---

**最后更新**: 2026/2/26 21:55
**版本**: 1.0.0
**AppID**: wx2382e1949d031ba6
