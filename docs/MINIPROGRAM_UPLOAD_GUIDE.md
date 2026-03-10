# 微信小程序自动上传使用指南

## 概述

本项目提供了自动上传微信小程序代码到微信服务器的脚本，方便开发者快速提交审核。

## 前置要求

1. **安装微信开发者工具**
   - 下载地址: https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
   - 安装后确保可以正常打开项目

2. **登录微信开发者工具**
   - 打开微信开发者工具
   - 使用微信扫码登录
   - 确保登录状态正常

3. **配置小程序信息**
   - 在微信公众平台 https://mp.weixin.qq.com/ 配置小程序信息
   - 获取小程序 AppID

## 配置步骤

### 1. 配置上传参数

编辑项目根目录下的 `miniprogram-upload.config` 文件：

```bash
# 小程序配置
APP_ID=wx1234567890abcdef  # 替换为你的小程序AppID
APP_NAME=游戏账号租赁平台

# 开发者工具路径（根据你的系统调整）
# macOS
CLI_PATH=/Applications/wechatwebdevtools.app/Contents/MacOS/cli
# Windows
CLI_PATH=C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat
# Linux
CLI_PATH=/opt/wechat-web-devtools/cli

# 项目路径（相对于当前目录）
PROJECT_PATH=./miniprogram

# 上传配置
VERSION_TYPE=auto  # auto: 自动生成版本号, manual: 手动指定版本号
VERSION_PREFIX=1.0.
VERSION_FILE=./.miniprogram-version

# 上传描述
UPLOAD_DESC_PREFIX=自动上传
```

### 2. 主要配置说明

#### APP_ID
- 必填，你的小程序 AppID
- 在微信公众平台 > 开发 > 开发设置中获取

#### CLI_PATH
- 微信开发者工具 CLI 的完整路径
- 根据你的操作系统选择对应的路径

#### PROJECT_PATH
- 小程序项目目录相对于项目根目录的路径
- 默认为 `./miniprogram`

#### VERSION_TYPE
- `auto`: 自动递增版本号（推荐）
- `manual`: 手动指定版本号

#### VERSION_PREFIX
- 版本号前缀
- 例如: `1.0.` 会生成 `1.0.0`, `1.0.1`, `1.0.2`...

#### VERSION_FILE
- 版本号存储文件路径
- 用于记录当前版本号

#### UPLOAD_DESC_PREFIX
- 上传描述前缀
- 自动上传时会在前缀后添加时间戳

## 使用方法

### 方法1: 自动上传（推荐）

使用自动版本号和描述：

```bash
./scripts/upload-miniprogram.sh
```

脚本会：
1. 自动生成版本号（如：1.0.0, 1.0.1, 1.0.2...）
2. 自动生成上传描述（如：自动上传 2024-01-15 10:30:00）
3. 提示确认上传
4. 执行上传并显示结果

### 方法2: 指定版本号

手动指定版本号：

```bash
./scripts/upload-miniprogram.sh 1.2.3
```

### 方法3: 指定版本号和描述

同时指定版本号和上传描述：

```bash
./scripts/upload-miniprogram.sh 1.2.3 "修复登录bug"
```

## 上传后操作

1. **登录微信公众平台**
   - 访问 https://mp.weixin.qq.com/
   - 登录你的小程序管理后台

2. **提交审核**
   - 进入「版本管理」
   - 找到刚上传的版本
   - 点击「提交审核」
   - 填写审核信息并提交

3. **审核进度**
   - 审核通常需要 1-7 个工作日
   - 可以在「版本管理」中查看审核状态

4. **发布上线**
   - 审核通过后，点击「发布」
   - 选择发布范围（全量或灰度）
   - 确认发布

## 常见问题

### 1. 找不到微信开发者工具CLI

**错误信息**:
```
无法找到微信开发者工具CLI
```

**解决方案**:
- 确认微信开发者工具已安装
- 根据操作系统修改 `miniprogram-upload.config` 中的 `CLI_PATH`
- macOS: `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`
- Windows: `C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat`
- Linux: `/opt/wechat-web-devtools/cli`

### 2. 上传失败：未登录

**错误信息**:
```
登录状态已过期，请重新登录
```

**解决方案**:
- 打开微信开发者工具
- 使用微信扫码登录
- 确保登录状态正常

### 3. 项目路径错误

**错误信息**:
```
项目路径不存在
```

**解决方案**:
- 检查 `miniprogram-upload.config` 中的 `PROJECT_PATH` 配置
- 确保路径正确且目录存在

### 4. APPID 配置错误

**错误信息**:
```
小程序ID配置错误
```

**解决方案**:
- 检查 `miniprogram-upload.config` 中的 `APP_ID` 配置
- 确认与微信公众平台中的 AppID 一致

### 5. 上传成功但无法找到版本

**可能原因**:
- 微信开发者工具登录状态异常
- 网络问题

**解决方案**:
- 重新登录微信开发者工具
- 检查网络连接
- 重试上传

## 最佳实践

1. **版本管理**
   - 使用自动版本号，避免版本号冲突
   - 定期清理 `.miniprogram-version` 文件（可选）

2. **提交审核前**
   - 本地充分测试
   - 检查所有功能是否正常
   - 确认无严重bug

3. **上传描述**
   - 使用有意义的描述，方便后续追溯
   - 例如："修复登录bug", "新增支付功能"

4. **审核时间**
   - 避免在周五、节假日提交审核
   - 提前1-2个工作日提交

## 自动化集成

### GitHub Actions

可以在 GitHub Actions 中集成自动上传：

```yaml
name: Upload WeChat Mini Program

on:
  push:
    branches:
      - main

jobs:
  upload:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2

      - name: Upload Mini Program
        run: |
          chmod +x scripts/upload-miniprogram.sh
          ./scripts/upload-miniprogram.sh "${{ github.sha }}"
        env:
          CI: true
```

### Git Hooks

在提交代码前自动上传：

```bash
# .git/hooks/pre-commit
#!/bin/bash
./scripts/upload-miniprogram.sh
```

## 注意事项

1. ⚠️ **上传前务必测试**，避免将bug版本提交到微信
2. ⚠️ **上传次数限制**：微信可能限制每日上传次数，请合理使用
3. ⚠️ **审核规则**：遵守微信小程序审核规范，避免被拒
4. ⚠️ **敏感信息**：不要在代码中泄露密钥等敏感信息
5. ⚠️ **权限配置**：确保小程序账号有上传权限

## 联系支持

如有问题，请：
1. 查看本文档的「常见问题」部分
2. 查看微信开发者工具官方文档
3. 联系项目维护者

---

**最后更新**: 2024-01-15
