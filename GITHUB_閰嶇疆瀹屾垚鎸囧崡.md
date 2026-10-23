# 🚀 GitHub Actions 配置完成指南

## 📦 当前状态

✅ **已完成**：
- [x] 小程序代码已开发完成
- [x] GitHub Actions配置文件已创建
- [x] 上传脚本已准备
- [x] 配置指南文档已创建

⏳ **待完成**：
- [ ] 创建GitHub仓库
- [ ] 配置远程仓库
- [ ] 推送代码到GitHub
- [ ] 添加Secret到GitHub
- [ ] 添加IP白名单到微信平台

---

## 🎯 快速开始（5步完成）

### 第1步：创建GitHub仓库

1. **访问GitHub创建页面**
   ```
   https://github.com/new
   ```

2. **填写仓库信息**
   ```
   Repository name: miniprogram-game-account-rental
   Description: 游戏账号租赁平台小程序
   Public/Private: 根据需要选择（推荐Private）
   ```

3. **点击 "Create repository"** 按钮

---

### 第2步：配置远程仓库并推送

创建仓库后，GitHub会显示命令，执行以下命令：

```bash
cd /workspace/projects

# 添加远程仓库（替换YOUR_USERNAME为你的GitHub用户名）
git remote add origin https://github.com/YOUR_USERNAME/miniprogram-game-account-rental.git

# 推送代码到GitHub
git push -u origin main
```

**示例**（假设你的GitHub用户名是 `zhangsan`）：
```bash
git remote add origin https://github.com/zhangsan/miniprogram-game-account-rental.git
git push -u origin main
```

---

### 第3步：在GitHub添加Secret

1. **进入仓库的Secrets页面**
   ```
   https://github.com/YOUR_USERNAME/miniprogram-game-account-rental/settings/secrets/actions
   ```

2. **点击 "New repository secret"**

3. **填写Secret信息**
   ```
   Name: MINIPROGRAM_PRIVATE_KEY
   Value: (粘贴以下完整内容)
   ```

4. **Secret的Value值**（复制全部内容，包括BEGIN和END行）：

```
CONFIGURE_LOCALLY
```

5. **点击 "Add secret"**

---

### 第4步：在微信平台添加IP白名单

1. **登录微信公众平台**
   ```
   https://mp.weixin.qq.com
   ```

2. **进入开发设置**
   - 登录后
   - 点击：开发 → 开发管理 → 开发设置
   - 找到"小程序代码上传"部分

3. **添加IP白名单**
   点击"配置"或"添加"，逐个添加以下IP：
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

4. **保存配置**

---

### 第5步：触发上传

#### 方式A：通过代码推送触发（推荐）

```bash
cd /workspace/projects

# 创建空提交触发上传
git commit --allow-empty -m "触发小程序上传"

# 推送到GitHub
git push origin main
```

#### 方式B：手动触发

1. 访问Actions页面
   ```
   https://github.com/YOUR_USERNAME/miniprogram-game-account-rental/actions
   ```

2. 找到 "Upload WeChat Mini Program" workflow

3. 点击 "Run workflow" → 选择分支 → 点击 "Run workflow"

---

## 📊 查看上传结果

1. **访问Actions页面**
   ```
   https://github.com/YOUR_USERNAME/miniprogram-game-account-rental/actions
   ```

2. **查看运行记录**
   - 点击最新的运行记录
   - 可以看到每个步骤的执行情况
   - 绿色✔表示成功，红色✗表示失败

3. **上传成功后**
   - 登录微信公众平台：https://mp.weixin.qq.com
   - 进入：管理 → 版本管理
   - 可以看到新上传的版本

---

## 🎉 完成！

配置完成后，每次推送代码到main分支都会自动上传小程序到微信平台。

### 自动上传触发条件：
- 推送代码到main分支
- 提交Pull Request到main分支
- 手动触发workflow

### 版本号规则：
`1.0.YYYYMMDD.HHMM`
例如：`1.0.20260226.1950`

---

## 🔧 故障排查

### 问题1：Secret未找到

**原因**：Secret名称不正确

**解决**：确认Secret名称是 `MINIPROGRAM_PRIVATE_KEY`（区分大小写）

### 问题2：IP白名单错误

**原因**：IP地址未添加到微信白名单

**解决**：确认已添加所有4个IP地址，等待5-10分钟后重试

### 问题3：上传失败

**原因**：配置文件路径错误或文件不存在

**解决**：检查 `.github/workflows/upload-miniprogram.yml` 和 `miniprogram/upload.js` 是否存在

---

## 📚 相关文档

- 详细配置指南：[GITHUB_ACTIONS_配置指南.md](./GITHUB_ACTIONS_配置指南.md)
- GitHub Actions文档：https://docs.github.com/cn/actions
- 微信小程序上传文档：https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html

---

**现在就开始配置吧！** 🚀
