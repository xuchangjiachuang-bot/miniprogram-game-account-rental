# 🚀 小程序快速上传

私钥已永久配置，可以使用以下任意方式快速上传：

## 🔍 配置检查（首次使用）

在首次上传前，建议先检查配置是否正确：

```bash
node check-upload-config.js
```

确保所有检查都通过后再开始上传。

---

## 1️⃣ 最简单：一键上传

```bash
./一键上传.sh
```

## 2️⃣ 推荐方式：npm 脚本

```bash
cd miniprogram
npm run upload
```

## 3️⃣ Shell 脚本

```bash
bash upload-miniprogram.sh
```

## 4️⃣ Node.js 脚本

```bash
node upload-wechat-miniprogram.js
```

---

## 📋 指定版本号和描述

所有上传方式都支持指定版本号和描述：

```bash
# 方式 1
./一键上传.sh 1.0.20260226.2200 "修复登录bug"

# 方式 2
cd miniprogram
npm run upload 1.0.20260226.2200 "修复登录bug"

# 方式 3
bash upload-miniprogram.sh 1.0.20260226.2200 "修复登录bug"

# 方式 4
node upload-wechat-miniprogram.js 1.0.20260226.2200 "修复登录bug"
```

---

## 📚 详细文档

- **快速指南**: [docs/UPLOAD_QUICK_GUIDE.md](./docs/UPLOAD_QUICK_GUIDE.md)
- **完整指南**: [UPLOAD_WECHAT_GUIDE.md](./UPLOAD_WECHAT_GUIDE.md)

---

## ✅ 配置状态

- ✅ 私钥文件已配置：`miniprogram/private.key`
- ✅ miniprogram-ci 已安装
- ✅ 上传脚本已准备
- ✅ AppID: `wx2382e1949d031ba6`

---

## 🔄 上传后操作

1. 登录 https://mp.weixin.qq.com/
2. 进入：管理 → 版本管理
3. 查看上传的版本
4. 点击「提交审核」
5. 等待审核通过后发布

---

**就这么简单！🎉**
