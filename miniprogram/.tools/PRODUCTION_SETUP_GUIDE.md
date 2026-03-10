# 🎯 小程序生产环境配置完整指南

## 📊 当前状态

### ✅ 已完成
- ✅ 小程序环境已切换为 `production`
- ✅ API地址已配置为 `https://yugioh.top/api`
- ✅ 本地后端服务运行正常（端口5000）

### ⚠️ 需要配置
- ⚠️ 域名解析配置
- ⚠️ 后端服务外部访问配置
- ⚠️ 微信小程序服务器域名白名单

---

## 🔍 问题诊断

### 测试结果

```bash
# 测试本地服务（成功）
curl http://localhost:5000
✅ 返回 200 OK

# 测试生产域名（失败）
curl https://yugioh.top/api
❌ 连接被重置 (Connection reset by peer)
```

**结论**：
- ✅ 本地后端服务运行正常
- ❌ 域名 `yugioh.top` 无法访问您的服务器
- ❌ 小程序无法通过 `https://yugioh.top/api` 访问API

---

## 🚨 两种解决方案

### 方案A：配置域名和服务器（推荐，完整方案）⭐

#### 第一步：配置域名解析

1. **登录域名管理平台**
   - 如果是阿里云：https://dns.console.aliyun.com/
   - 如果是腾讯云：https://console.cloud.tencent.com/cns
   - 或者其他域名服务商

2. **添加A记录**
   ```
   主机记录：@（或者 www）
   记录类型：A
   记录值：[您的服务器公网IP地址]
   TTL：600
   ```

3. **验证域名解析**
   ```bash
   # 等待5-10分钟后验证
   nslookup yugioh.top
   ping yugioh.top
   ```

---

#### 第二步：配置Nginx反向代理

1. **安装Nginx**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nginx

   # CentOS/RHEL
   sudo yum install nginx
   ```

2. **配置Nginx**

   创建配置文件：`/etc/nginx/sites-available/yugioh.top`

   ```nginx
   server {
       listen 80;
       server_name yugioh.top;

       # 重定向到HTTPS
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name yugioh.top;

       # SSL证书配置（使用Let's Encrypt免费证书）
       ssl_certificate /etc/letsencrypt/live/yugioh.top/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yugioh.top/privkey.pem;

       # SSL配置
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ssl_prefer_server_ciphers on;

       # API反向代理
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }

       # WebSocket代理
       location /socket.io {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **启用配置**
   ```bash
   sudo ln -s /etc/nginx/sites-available/yugioh.top /etc/nginx/sites-enabled/
   sudo nginx -t  # 测试配置
   sudo systemctl reload nginx
   ```

---

#### 第三步：获取SSL证书

```bash
# 安装certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yugioh.top

# 自动续期
sudo certbot renew --dry-run
```

---

#### 第四步：配置服务器防火墙

```bash
# 开放80和443端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 查看防火墙状态
sudo ufw status
```

---

#### 第五步：测试API访问

```bash
# 测试HTTPS访问
curl https://yugioh.top/api

# 应该返回与本地相同的响应
```

---

#### 第六步：配置微信小程序域名白名单

1. **登录微信公众平台**
   - 访问：https://mp.weixin.qq.com/

2. **进入服务器域名配置**
   - 导航：开发 → 开发管理 → 开发设置 → 服务器域名

3. **添加域名到 request 合法域名**
   ```
   https://yugioh.top
   ```

4. **保存配置**

---

#### 第七步：重新上传小程序

```bash
cd /workspace/projects/miniprogram
node upload-simple.js
```

---

### 方案B：使用Mock数据（临时方案）⚡

如果暂时无法配置域名，可以使用Mock数据进行测试和演示。

#### 修改配置文件

编辑 `miniprogram/utils/config.js`：

```javascript
const environments = {
  // 生产环境（正式上线）
  production: {
    baseUrl: 'https://yugioh.top/api',
    wsUrl: 'wss://yugioh.top',
    debug: false,
    useMockData: true,  // 🔴 改为 true
  },
};
```

#### 重新上传

```bash
cd /workspace/projects/miniprogram
node upload-simple.js
```

#### 优点
- ✅ 无需配置域名
- ✅ 立即可用
- ✅ 可以测试界面和交互

#### 缺点
- ❌ 无法测试真实API
- ❌ 无法进行真实交易
- ❌ 只是临时方案

---

## 📋 两种方案对比

| 项目 | 方案A（配置域名） | 方案B（Mock数据） |
|------|-----------------|------------------|
| 时间成本 | 30-60分钟 | 5分钟 |
| 技术难度 | 中等 | 简单 |
| 功能完整性 | ✅ 完整 | ❌ 仅界面 |
| 是否需要服务器 | ✅ 需要 | ❌ 不需要 |
| 是否需要SSL证书 | ✅ 需要 | ❌ 不需要 |
| 是否可长期使用 | ✅ 可以 | ❌ 仅测试 |
| 推荐度 | ⭐⭐⭐⭐⭐ | ⭐⭐ |

---

## 🎯 推荐执行流程

### 如果您有服务器权限

```
方案A（完整配置）
↓
1. 配置域名解析（10分钟）
↓
2. 安装配置Nginx（15分钟）
↓
3. 获取SSL证书（5分钟）
↓
4. 测试API访问（2分钟）
↓
5. 配置微信白名单（5分钟）
↓
6. 重新上传小程序（2分钟）
↓
总耗时：约40分钟
```

### 如果您暂时无法配置服务器

```
方案B（临时使用）
↓
1. 开启Mock数据（1分钟）
↓
2. 重新上传小程序（2分钟）
↓
总耗时：约3分钟
```

---

## 📝 配置检查清单

### 方案A检查清单

- [ ] 域名解析已配置
- [ ] Nginx已安装并配置
- [ ] SSL证书已获取
- [ ] 防火墙已开放端口
- [ ] API可以通过HTTPS访问
- [ ] 微信白名单已配置
- [ ] 小程序已重新上传

### 方案B检查清单

- [ ] Mock数据已开启
- [ ] 小程序已重新上传
- [ ] 界面功能正常测试

---

## 💡 重要提示

### 关于域名

1. **域名备案**
   - 如果是中国大陆服务器，域名必须备案
   - 如果是海外服务器，可以不备案
   - 小程序上线必须使用备案域名

2. **域名类型**
   - 主域名：`yugioh.top`
   - 子域名：`api.yugioh.top`（推荐）

---

### 关于SSL证书

1. **免费证书**
   - Let's Encrypt：免费，90天有效期，自动续期
   - 推荐：`sudo certbot --nginx`

2. **付费证书**
   - 阿里云、腾讯云等提供的证书
   - 通常是1年有效期

---

### 关于微信小程序

1. **域名要求**
   - 必须使用HTTPS
   - 域名必须备案（中国大陆）
   - 不支持IP地址

2. **配置生效时间**
   - 通常几分钟
   - 最长24小时

---

## 🚨 常见错误

### 错误1：域名解析不生效

**现象**：`ping yugioh.top` 无法解析

**解决**：
1. 检查DNS记录是否正确
2. 等待DNS生效（5-10分钟）
3. 清除本地DNS缓存：`sudo flushdns`（macOS）或 `ipconfig /flushdns`（Windows）

---

### 错误2：Nginx配置失败

**现象**：`nginx -t` 报错

**解决**：
1. 检查配置文件语法
2. 查看错误日志：`tail -n 50 /var/log/nginx/error.log`
3. 修正配置错误

---

### 错误3：SSL证书获取失败

**现象**：`certbot` 报错

**解决**：
1. 确认域名解析已生效
2. 确认80端口已开放
3. 检查防火墙设置

---

### 错误4：API返回404

**现象**：`curl https://yugioh.top/api` 返回404

**解决**：
1. 检查Nginx配置的proxy_pass路径
2. 检查后端服务是否运行
3. 检查后端路由配置

---

## 📚 参考资源

### Nginx配置
- [Nginx官方文档](https://nginx.org/en/docs/)
- [Nginx反向代理配置](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

### SSL证书
- [Let's Encrypt官方文档](https://letsencrypt.org/docs/)
- [Certbot使用指南](https://certbot.eff.org/docs/)

### 微信小程序
- [服务器域名配置](https://developers.weixin.qq.com/miniprogram/dev/framework/server-communication.html)
- [网络请求](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)

---

## 🎯 总结

### 当前状态
- ✅ 小程序代码已优化完成
- ✅ 环境已切换为production
- ❌ 生产域名未配置（需要您配置）

### 下一步行动

**如果您有服务器权限**：
- 按照方案A配置域名和Nginx（40分钟）
- 完整配置后小程序可正式使用

**如果您暂时无法配置**：
- 按照方案B开启Mock数据（3分钟）
- 用于测试和演示界面

### 需要帮助？

如果配置过程中遇到问题，请提供：
1. 错误信息截图
2. 配置文件内容
3. 执行的命令和输出

我会帮您解决问题！

---

**文档创建时间**: 2026-02-27 14:58
**最后更新**: 2026-02-27 14:58
