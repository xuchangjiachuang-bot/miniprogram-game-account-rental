# 工具和脚本索引

## 🚀 快速上传工具

### 1. 快速上传脚本（Shell）- 最推荐

**文件位置**：`quick-upload.sh`

**使用方法**：
```bash
./quick-upload.sh [版本号] [描述]

# 示例
./quick-upload.sh 1.0.20260226.2137 "修复TabBar配置错误"
```

**优点**：
- ✅ 最简单，一行命令搞定
- ✅ 自动从 CHANGELOG.md 读取版本
- ✅ 彩色输出，清晰易读
- ✅ 自动检查配置

**详细说明**：见 [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

### 2. Node.js 上传脚本

**文件位置**：`scripts/upload-miniprogram.js`

**使用方法**：
```bash
node scripts/upload-miniprogram.js [版本号] [描述]

# 示例
node scripts/upload-miniprogram.js 1.0.20260226.2137 "修复TabBar配置错误"
```

**优点**：
- ✅ 跨平台支持（Linux/Mac/Windows）
- ✅ 自动从 CHANGELOG.md 读取版本
- ✅ 详细的错误提示

**详细说明**：见 [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

### 3. 对象存储上传脚本

**文件位置**：`miniprogram/upload-latest.js`

**使用方法**：
```bash
node miniprogram/upload-latest.js
```

**功能**：
- ✅ 将小程序打包文件上传到对象存储
- ✅ 生成下载链接
- ✅ 7天有效期

**详细说明**：见 [UPLOAD_GUIDE.md](UPLOAD_GUIDE.md)

---

## 📋 项目文档

| 文档 | 说明 | 链接 |
|------|------|------|
| 快速参考 | 快速上传指南和常用命令 | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) |
| 上传指南 | 详细的上传说明和步骤 | [UPLOAD_GUIDE.md](UPLOAD_GUIDE.md) |
| 版本日志 | 完整的版本更新历史 | [CHANGELOG.md](CHANGELOG.md) |
| 修复说明 | 详细的修复说明和问题记录 | [FIX_README.md](FIX_README.md) |
| 配置指南 | 如何配置真实 API | [CONFIG_GUIDE.md](CONFIG_GUIDE.md) |
| 自动上传配置 | 如何配置自动上传 | [AUTO_UPLOAD_CONFIG.md](AUTO_UPLOAD_CONFIG.md) |
| 工具索引 | 本文档 | [TOOLS_INDEX.md](TOOLS_INDEX.md) |

---

## 🔧 常用命令

### 小程序相关

```bash
# 快速上传到微信平台（推荐）
./quick-upload.sh

# 使用 Node.js 脚本上传
node scripts/upload-miniprogram.js

# 上传到对象存储
node miniprogram/upload-latest.js

# 打包小程序
tar -czf miniprogram-latest.tar.gz miniprogram/
```

### 配置检查

```bash
# 检查私钥文件
ls -la miniprogram/private.key

# 检查私钥权限
stat -c "%a" miniprogram/private.key  # Linux
stat -f "%A" miniprogram/private.key  # Mac

# 设置私钥权限
chmod 600 miniprogram/private.key

# 查看项目配置
cat miniprogram/project.config.json
```

### 开发相关

```bash
# 启动 Next.js 开发服务器
coze dev

# 构建生产版本
coze build

# 启动生产服务器
coze start

# 安装依赖
pnpm install
```

---

## 📁 文件位置速查

### 小程序核心文件

| 文件 | 位置 | 说明 |
|------|------|------|
| 小程序入口 | `miniprogram/app.js` | 小程序入口文件 |
| 小程序配置 | `miniprogram/app.json` | 全局配置 |
| 项目配置 | `miniprogram/project.config.json` | 微信开发者工具配置 |
| 私钥文件 | `miniprogram/private.key` | 上传私钥（需自行添加） |
| API 接口 | `miniprogram/utils/api.js` | API 接口定义 |
| 网络请求 | `miniprogram/utils/request.js` | 网络请求封装 |
| 配置文件 | `miniprogram/utils/config.js` | 配置参数 |
| Mock 数据 | `miniprogram/utils/mock-data.js` | 测试数据 |

### 上传工具

| 文件 | 位置 | 说明 |
|------|------|------|
| 快速上传 | `quick-upload.sh` | Shell 上传脚本 |
| Node.js 上传 | `scripts/upload-miniprogram.js` | Node.js 上传脚本 |
| 对象存储上传 | `miniprogram/upload-latest.js` | 上传到对象存储 |

### 文档文件

| 文件 | 位置 | 说明 |
|------|------|------|
| 快速参考 | `QUICK_REFERENCE.md` | 快速上传指南 |
| 上传指南 | `UPLOAD_GUIDE.md` | 详细上传说明 |
| 版本日志 | `CHANGELOG.md` | 版本更新历史 |
| 修复说明 | `FIX_README.md` | 修复说明 |
| 配置指南 | `CONFIG_GUIDE.md` | 配置指南 |
| 自动上传配置 | `AUTO_UPLOAD_CONFIG.md` | 自动上传配置 |
| 工具索引 | `TOOLS_INDEX.md` | 本文档 |

---

## ⚙️ 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `MINIPROGRAM_PRIVATE_KEY_PATH` | 私钥文件路径 | `/path/to/private.key` |
| `COZE_BUCKET_ENDPOINT_URL` | 对象存储端点 | `https://tos-cn-beijing.volces.com` |
| `COZE_BUCKET_NAME` | 对象存储桶名 | `coze-coding-project` |

---

## 🔍 故障排除

### 常见错误

#### 1. 找不到私钥文件

**错误**：
```
❌ 找不到私钥文件
```

**解决方案**：
1. 登录微信小程序后台获取私钥
2. 放置到 `miniprogram/private.key`
3. 设置权限：`chmod 600 miniprogram/private.key`

详见：[AUTO_UPLOAD_CONFIG.md](AUTO_UPLOAD_CONFIG.md)

#### 2. 上传失败

**错误**：
```
❌ 上传失败
```

**解决方案**：
1. 检查 AppID 是否正确
2. 检查私钥文件是否有效
3. 检查网络连接
4. 查看详细错误日志

#### 3. 权限不安全

**警告**：
```
⚠️ 私钥文件权限不安全（当前: 644，建议: 600）
```

**解决方案**：
```bash
chmod 600 miniprogram/private.key
```

---

## 📞 获取帮助

### 查看文档

- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 快速参考指南
- [UPLOAD_GUIDE.md](UPLOAD_GUIDE.md) - 详细上传指南
- [CHANGELOG.md](CHANGELOG.md) - 版本日志
- [FIX_README.md](FIX_README.md) - 修复说明

### 查看日志

```bash
# 查看小程序日志（微信开发者工具）
# 控制台 -> Console 面板

# 查看上传日志
./quick-upload.sh

# 查看详细日志
node scripts/upload-miniprogram.js --verbose
```

### 获取版本信息

```bash
# 查看最新版本
head -20 CHANGELOG.md

# 查看项目配置
cat miniprogram/project.config.json
```

---

## 🎯 快速开始

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

### 日常开发

```bash
# 1. 修改代码
# （编辑代码文件）

# 2. 更新版本日志
# 编辑 CHANGELOG.md

# 3. 上传到对象存储
node miniprogram/upload-latest.js

# 4. 上传到微信平台
./quick-upload.sh

# 5. 提交审核
# 登录微信小程序后台
```

---

**最后更新**: 2026/2/26 21:37
