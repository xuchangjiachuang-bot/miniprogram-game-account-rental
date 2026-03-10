# 小程序上传快速开始

## 一键上传

```bash
# 方式1: 使用npm脚本（推荐）
pnpm mp:upload

# 方式2: 直接运行脚本
./scripts/upload-miniprogram.sh
```

## 指定版本号和描述

```bash
# 使用npm脚本
pnpm mp:upload:manual 1.0.1 "修复登录bug"

# 或直接运行脚本
./scripts/upload-miniprogram.sh 1.0.1 "修复登录bug"
```

## 首次使用配置

1. **编辑配置文件** `miniprogram-upload.config`:
```bash
APP_ID=wx1234567890abcdef  # 替换为你的AppID
CLI_PATH=/Applications/wechatwebdevtools.app/Contents/MacOS/cli  # macOS路径
PROJECT_PATH=./miniprogram
```

2. **登录微信开发者工具**
   - 打开微信开发者工具
   - 扫码登录

3. **运行上传命令**
   ```bash
   pnpm mp:upload
   ```

## 上传后操作

1. 登录 https://mp.weixin.qq.com/
2. 进入「版本管理」
3. 找到上传的版本
4. 点击「提交审核」
5. 等待审核通过后点击「发布」

## 详细文档

完整使用指南请查看: [docs/MINIPROGRAM_UPLOAD_GUIDE.md](./MINIPROGRAM_UPLOAD_GUIDE.md)

## 常见问题

**Q: 提示"未登录"?**
A: 打开微信开发者工具，扫码登录

**Q: 提示"找不到CLI"?**
A: 检查配置文件中的 CLI_PATH 是否正确

**Q: 上传成功但找不到版本?**
A: 重新登录微信开发者工具，检查网络连接
