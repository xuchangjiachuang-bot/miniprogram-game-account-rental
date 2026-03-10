# GitHub Actions 小程序上传配置指南

## 📋 配置步骤总览

1. ✅ 代码已准备完毕
2. ⏳ 推送代码到GitHub
3. ⏳ 在GitHub添加Secret
4. ⏳ 在微信平台添加白名单
5. ⏳ 触发上传

---

## 🚀 详细配置步骤

### 第1步：确认代码已提交

✅ **已完成** - miniprogram目录已在Git仓库中

### 第2步：推送代码到GitHub

如果还没有GitHub仓库，请按以下步骤操作：

```bash
# 1. 在GitHub创建新仓库
# 访问 https://github.com/new
# 仓库名：miniprogram-game-account-rental
# 设为Public或Private皆可

# 2. 添加远程仓库（替换YOUR_USERNAME）
cd /workspace/projects
git remote add origin https://github.com/YOUR_USERNAME/miniprogram-game-account-rental.git

# 3. 推送代码
git push -u origin main
```

如果已有GitHub仓库，直接推送：

```bash
cd /workspace/projects
git push origin main
```

---

### 第3步：在GitHub添加Secret

**重要**：Secret是敏感信息，只在GitHub内部使用，不会公开显示。

#### 操作步骤：

1. **进入仓库设置页面**
   ```
   https://github.com/YOUR_USERNAME/miniprogram-game-account-rental/settings/secrets/actions
   ```

2. **添加新的Secret**
   - 点击 **"New repository secret"** 按钮

3. **填写Secret信息**
   ```
   Name: MINIPROGRAM_PRIVATE_KEY
   Value: (粘贴以下完整内容，包括 -----BEGIN----- 和 -----END-----)
   ```

4. **Secret的Value值**：
   ```text
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpQIBAAKCAQEA8L8xt6FKKk5YnaoM7hXlc6t2wE/h51zn3jlb1FO6rWTAvM1V
   fSggV0BwWlYS2s9fyTSFsw7GaZy2q3bdVL6frXUtYdrdAXdRKYFDATRMbh72V8Ew
   VjYqHrOkx1bNkB9q2zcTEXJygvDjW7f7b9cJa0exN1MddnRgWVXecn0SlvHKCAZS
   +cjz6CqMzRmIlsY02Pn/D5AO3KgjumuaFTJE2aKlnUxEzfr/8l9f0iKSW+5JIu2E
   NKisHEyXctq1x83IFuokOh6vr6kdzHuWL97Kfro+JuX5MAhzONmGkVnwP4RWUDQi
   ggUTa12QjRMQRHQXLiEvtuKOgKhZUUCsSnFKCQIDAQABAoIBAB3m4Xn5YojWqlMK
   6Ag6WAGB7oH8agael34Wib1ZmPooZXgN2Oxuq3Wq30mZH0ZmM3N+Poz67NH5UQcD
   AIKiGpskzro0wPaJp18MWxIvOL8EwXws1qAeoiSmE3Ve5rFb9Z28vXWRTX/OA69E
   rso5X0Yf5XcFr8citUTjUXnO5xwwNkcZsTk/6MOssAmec2HDvcbgrLWDw6XJmfOq
   LTb9jsrXg7XJzUSHJFS2kptT6JlSR27xqmN7PtxvQMaX7B86yyDKpP8VWu806PPx
   t/ec17UBxFedTwXDAKzmzrHePOp1celVN0ZmH0GYH/465A29bckbe+nwrDMmOl2o
   /oKcYgECgYEA+zWA+r2dnat4snFOgk5/pzLYZJ89fqLLi2GaZJMPhNSTLnQh6Huf
   xJru/S04Mc5PKmWYo7zPEfT84nEbAufFrEBJPfBzUamvsmWUPUUtRJCqEpXaUrny
   3nZLl5Yvraarw+BBc4Wy3vxKHffitDohX/2GWX+I5t3tF6mSp8nqTNECgYEA9Vac
   OtTaYpQUPIjgYPnuQdX7wDw6HzXL/3ZAAoXyw8f5v3Q4OmicHejFUhrV39KYLWtm
   8y0TBLcIV1rKzzTanw8unkbT785gUVW2CX78BGzSXFU9Qfo8H+VquP4Hc8MqdIki
   l/oDRu9o8M93/iy+ypve/MqkT9V6S/lX1xnpF7kCgYEA4ooMh5JJum9xCBLQRwi9
   a62ZoZxNG4952XcqgXpxa0s8c479KSebG/TQgvatj5TKpaQ7M6XIYxw4lYiEYGld
   RQowQrA9fq50qH+cYGiq+wMurFYBLctM7ztkzg39by84BQuOWrx+Y0LHICF0iy1E
   /cimyL0PW4tVDZq5i6C2L5ECgYEApx8Xj0/db5dVbaMDzauS7E/6jQm5wfbgfqWr
   lsxuAYWgkBV4E/mclxcwCuzy0ePf+9iUqYQD14ti6DaVvq5PWlh6NiEjT9CyddVA
   CpnwzIbgiTsbXm06NbQOjfOlWesRaY7c/M+3GcQOJTP+lise0F97d5IGecd+5m/0
   sTcaPCkCgYEAl5GJV/YmF3BPTe8KiL9rEkH/v3x1Rf6+wLD7L6amN5Fr/h9iOJ43
   FYSTFSl10sJdxdyPHeYPHvVbLiNARdwaJ5Ii5QRTQKhmG2kn0yEv/yjj5jOQiLFb
   kDPy361yZNs8KmUFCbUmrDcRKrgj4UR5Fnl7S4+g1x6bFV5gI/QeEKI=
   -----END RSA PRIVATE KEY-----
   ```

5. 点击 **"Add secret"** 保存

---

### 第4步：在微信平台添加白名单

#### 操作步骤：

1. **登录微信公众平台**
   ```
   https://mp.weixin.qq.com
   ```

2. **进入开发设置**
   - 登录后
   - 进入：开发 → 开发管理 → 开发设置
   - 找到"小程序代码上传"部分

3. **添加IP白名单**
   点击"配置"或"添加"，逐个添加以下IP地址：
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

4. 保存配置

---

### 第5步：触发上传

#### 方式A：通过代码推送自动触发（推荐）

推送代码到main分支时会自动触发：
```bash
cd /workspace/projects
git commit --allow-empty -m "触发小程序上传"
git push origin main
```

#### 方式B：手动触发

1. 访问GitHub仓库的Actions页面
   ```
   https://github.com/YOUR_USERNAME/miniprogram-game-account-rental/actions
   ```

2. 找到 "Upload WeChat Mini Program" workflow

3. 点击 "Run workflow" 按钮

4. 选择分支（main）

5. 点击 "Run workflow" 绿色按钮

---

## 📊 监控上传进度

1. **查看Actions运行状态**
   ```
   https://github.com/YOUR_USERNAME/miniprogram-game-account-rental/actions
   ```

2. **查看具体步骤**
   - 点击具体的运行记录
   - 可以看到每个步骤的执行情况
   - 失败时会显示错误信息

3. **上传成功后**
   - 前往微信公众平台查看上传的版本
   - 进入：管理 → 版本管理
   - 可以看到新上传的版本

---

## 🔧 常见问题排查

### 问题1：Actions失败，提示Secret未找到

**原因**：Secret名称不正确或未添加

**解决**：
- 确认Secret名称是 `MINIPROGRAM_PRIVATE_KEY`（大小写敏感）
- 重新添加Secret

---

### 问题2：上传失败，IP白名单错误

**原因**：IP地址未添加到微信白名单

**解决**：
- 确认已添加所有4个GitHub Actions IP地址
- 等待5-10分钟后重试

---

### 问题3：上传成功但版本未显示

**原因**：微信平台可能有延迟

**解决**：
- 等待1-2分钟
- 刷新微信管理后台页面

---

## 📝 GitHub Actions配置说明

### 配置文件位置
```
.github/workflows/upload-miniprogram.yml
```

### 触发条件
- 推送到main分支
- 手动触发（workflow_dispatch）

### 执行步骤
1. 检出代码
2. 设置Node.js环境
3. 安装依赖（miniprogram-ci）
4. 创建私钥文件
5. 执行上传

### 版本号规则
版本号格式：`1.0.YYYYMMDD.HHMM`
例如：`1.0.20260226.1950`

---

## 🎯 优势

使用GitHub Actions的优势：

1. **IP固定**：GitHub Actions使用固定出口IP，无需频繁更新白名单
2. **自动化**：代码推送即触发上传，无需手动操作
3. **可靠性**：GitHub Actions基础设施稳定，上传成功率高
4. **免费**：公开仓库免费使用，私有仓库每月有免费额度
5. **可追溯**：每次上传都有记录，方便查看历史

---

## 📞 获取帮助

- **GitHub Actions文档**：https://docs.github.com/cn/actions
- **微信小程序上传文档**：https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html
- **项目仓库**：https://github.com/YOUR_USERNAME/miniprogram-game-account-rental

---

## ✅ 检查清单

上传前请确认：

- [ ] 代码已推送到GitHub仓库
- [ ] Secret已正确添加
- [ ] IP白名单已添加到微信平台
- [ ] AppID配置正确（twx2382e1949d031ba6）
- [ ] miniprogram/upload.js 文件存在
- [ ] .github/workflows/upload-miniprogram.yml 文件存在

---

**配置完成后，每次推送代码到main分支都会自动上传小程序！**
