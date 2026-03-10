# 快速参考指南

## 🚀 小程序上传工具

本项目提供了三种上传小程序到微信平台的方式：

---

## 方式一：快速上传脚本（推荐）

### Shell 脚本（最简单）

```bash
# 使用方法
./quick-upload.sh [版本号] [描述]

# 示例1：自动从 CHANGELOG.md 读取版本
./quick-upload.sh

# 示例2：指定版本号
./quick-upload.sh 1.0.20260226.2137

# 示例3：指定版本号和描述
./quick-upload.sh 1.0.20260226.2137 "修复TabBar配置错误"
```

**优点**：
- ✅ 最简单，一行命令搞定
- ✅ 自动从 CHANGELOG.md 读取版本
- ✅ 彩色输出，清晰易读
- ✅ 自动检查配置

---

### Node.js 脚本

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

---

## 方式二：使用微信开发者工具（手动）

### 步骤

1. **下载最新版本**
   ```
   查看对象存储下载链接（在项目输出中）
   ```

2. **在微信开发者工具中打开**
   - 点击"导入项目"
   - 选择 `miniprogram` 目录
   - AppID: `wx2382e1949d031ba6`

3. **测试小程序**
   - 点击"编译"按钮
   - 检查控制台，确保没有错误

4. **上传**
   - 点击工具栏的"上传"按钮
   - 填写版本号和描述
   - 点击"确定"

5. **提交审核**
   - 登录：https://mp.weixin.qq.com/
   - 进入：版本管理
   - 找到对应版本
   - 点击"提交审核"

**优点**：
- ✅ 可视化操作
- ✅ 可以预览效果
- ✅ 不需要配置私钥

---

## 方式三：直接使用 miniprogram-ci 命令

```bash
/usr/bin/miniprogram-ci upload \
  --appid wx2382e1949d031ba6 \
  --project-path /workspace/projects/miniprogram \
  --private-key-path /workspace/projects/miniprogram/private.key \
  --upload-version 1.0.20260226.2137 \
  --upload-description "修复TabBar配置错误" \
  --use-project-config
```

**优点**：
- ✅ 完全可控
- ✅ 可集成到 CI/CD 流程

---

## ⚙️ 配置说明

### 私钥配置（必需）

#### 获取私钥

1. 登录微信小程序后台：https://mp.weixin.qq.com/
2. 进入：开发 -> 开发管理 -> 开发设置
3. 找到"小程序代码上传"部分
4. 点击"生成"或"重置"私钥
5. 下载私钥文件（通常命名为 `private.key`）

#### 放置私钥

将私钥文件放到以下任一位置：

```bash
# 位置1：miniprogram 目录（推荐）
/workspace/projects/miniprogram/private.key

# 位置2：项目根目录
/workspace/projects/private.key
```

#### 设置权限

```bash
chmod 600 /workspace/projects/miniprogram/private.key
```

#### 环境变量（可选）

如果私钥不在默认位置，可以设置环境变量：

```bash
export MINIPROGRAM_PRIVATE_KEY_PATH=/path/to/private.key
./quick-upload.sh 1.0.20260226.2137
```

---

## 📋 完整工作流

### 开发新版本

```bash
# 1. 修复代码问题
# （编辑代码文件）

# 2. 更新版本号和日志
# 编辑 CHANGELOG.md

# 3. 打包新版本
tar -czf miniprogram-latest.tar.gz miniprogram/

# 4. 上传到对象存储
node upload-latest.js

# 5. 上传到微信平台（如果配置了私钥）
./quick-upload.sh
# 或
node scripts/upload-miniprogram.js

# 6. 提交审核
# 登录微信小程序后台提交审核
```

---

## 📁 项目结构

```
workspace/projects/
├── miniprogram/          # 小程序源码
│   ├── project.config.json
│   ├── private.key      # 私钥文件（需要自行添加）
│   └── ...
├── scripts/
│   └── upload-miniprogram.js  # Node.js 上传脚本
├── quick-upload.sh      # Shell 快速上传脚本
├── CHANGELOG.md         # 版本更新日志
├── QUICK_REFERENCE.md   # 本文档
├── UPLOAD_GUIDE.md      # 详细上传指南
└── AUTO_UPLOAD_CONFIG.md # 自动上传配置说明
```

---

## 🔍 常见问题

### Q1: 找不到私钥文件

**错误信息**：
```
❌ 找不到私钥文件
```

**解决方案**：
1. 按照上面的"私钥配置"步骤获取私钥
2. 将私钥文件放到 `miniprogram/` 目录
3. 设置文件权限：`chmod 600 miniprogram/private.key`

### Q2: 上传失败

**错误信息**：
```
❌ 上传失败
```

**解决方案**：
1. 检查 AppID 是否正确
2. 检查私钥文件是否有效
3. 检查网络连接
4. 查看详细错误日志

### Q3: 权限不安全

**警告信息**：
```
⚠️ 私钥文件权限不安全（当前: 644，建议: 600）
```

**解决方案**：
```bash
chmod 600 miniprogram/private.key
```

### Q4: 如何禁用自动上传

如果不想使用自动上传，可以：
1. 不配置私钥文件
2. 使用方式二（微信开发者工具手动上传）

---

## 📞 技术支持

遇到问题？查看以下文档：

- **详细上传指南**：`UPLOAD_GUIDE.md`
- **自动上传配置**：`AUTO_UPLOAD_CONFIG.md`
- **版本更新日志**：`CHANGELOG.md`
- **修复说明**：`FIX_README.md`
- **配置指南**：`CONFIG_GUIDE.md`

---

## 📝 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.20260226.2137 | 2026/2/26 21:37 | 修复TabBar配置错误 |
| 1.0.20260226.2133 | 2026/2/26 21:33 | 修复首页空白问题，添加Mock数据支持 |

---

**最后更新**: 2026/2/26 21:37
