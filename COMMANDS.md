# 常用命令速查

## 🚀 快速上传

```bash
# 最快的方式
./quick-upload.sh

# 指定版本号
./quick-upload.sh 1.0.20260226.2137

# 指定版本号和描述
./quick-upload.sh 1.0.20260226.2137 "修复TabBar配置错误"
```

---

## 📦 打包

```bash
# 打包小程序
tar -czf miniprogram-latest.tar.gz miniprogram/

# 打包到指定位置
tar -czf /path/to/output.tar.gz miniprogram/
```

---

## 🔧 配置检查

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

# 查看小程序配置
cat miniprogram/app.json
```

---

## 🌐 开发服务器

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

## 📋 查看版本

```bash
# 查看最新版本
head -20 CHANGELOG.md

# 查看完整版本历史
cat CHANGELOG.md

# 查看 AppID
grep '"appid"' miniprogram/project.config.json
```

---

## 🗑️ 清理

```bash
# 清理依赖
rm -rf node_modules
rm -rf .pnpm-store

# 清理打包文件
rm -f miniprogram-latest*.tar.gz

# 清理日志
rm -f *.log
rm -f upload-latest*.js
```

---

## 📝 创建新版本

```bash
# 1. 修改代码
# （编辑代码文件）

# 2. 更新 CHANGELOG.md
# 编辑 CHANGELOG.md，添加新版本信息

# 3. 打包
tar -czf miniprogram-latest.tar.gz miniprogram/

# 4. 上传到对象存储
node miniprogram/upload-latest.js

# 5. 上传到微信平台
./quick-upload.sh

# 6. 提交审核
# 登录 https://mp.weixin.qq.com/
```

---

## 🔍 查看文档

```bash
# 查看快速参考
cat QUICK_REFERENCE.md

# 查看上传指南
cat UPLOAD_GUIDE.md

# 查看版本日志
cat CHANGELOG.md

# 查看修复说明
cat FIX_README.md

# 查看配置指南
cat CONFIG_GUIDE.md

# 查看工具索引
cat TOOLS_INDEX.md
```

---

## ⚙️ 环境变量

```bash
# 设置私钥路径
export MINIPROGRAM_PRIVATE_KEY_PATH=/path/to/private.key

# 使用环境变量上传
./quick-upload.sh
```

---

## 🐛 调试

```bash
# 查看详细日志
node scripts/upload-miniprogram.js --verbose

# 查看错误日志
tail -f /var/log/*.log

# 查看微信开发者工具控制台
# 打开微信开发者工具 -> Console 面板
```

---

## 📞 获取帮助

```bash
# 查看快速上传脚本帮助
./quick-upload.sh --help

# 查看 Node.js 上传脚本帮助
node scripts/upload-miniprogram.js --help

# 查看工具索引
cat TOOLS_INDEX.md
```

---

## 🎯 快速参考

| 任务 | 命令 |
|------|------|
| 快速上传 | `./quick-upload.sh` |
| 打包 | `tar -czf miniprogram-latest.tar.gz miniprogram/` |
| 上传到对象存储 | `node miniprogram/upload-latest.js` |
| 检查私钥 | `ls -la miniprogram/private.key` |
| 设置权限 | `chmod 600 miniprogram/private.key` |
| 查看版本 | `head -20 CHANGELOG.md` |
| 启动开发服务器 | `coze dev` |

---

**最后更新**: 2026/2/26 21:37
