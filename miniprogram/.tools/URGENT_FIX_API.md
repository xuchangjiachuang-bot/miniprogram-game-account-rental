# 🚨 紧急修复：小程序API连接问题

## 问题分析

您的情况：
- ✅ 使用命令行上传（miniprogram-ci），不需要本地开发者工具
- ❌ 当前配置为开发环境（development），API地址是 `localhost:5000`
- ❌ 上传到微信平台后，无法访问 `localhost:5000`

**根本原因**：
- 小程序运行在用户手机上，无法访问您电脑的 `localhost:5000`
- 需要切换到生产环境，使用真实域名和HTTPS协议

---

## ✅ 立即修复（3步）

### 第一步：修改环境配置（1分钟）

编辑文件：`/workspace/projects/miniprogram/utils/config.js`

```javascript
// 将这一行：
const ENV = 'development';

// 改为：
const ENV = 'production';
```

**完整修改**：
```javascript
// utils/config.js
// 环境配置：development | production
// 开发时设置为 'development'，发布时设置为 'production'
const ENV = 'production';  // 🔴 修改这里

// 环境配置
const environments = {
  // 开发环境（本地开发环境）
  development: {
    baseUrl: 'http://localhost:5000/api',
    wsUrl: 'ws://localhost:5000',
    debug: true,
    useMockData: false,
  },

  // 生产环境（正式上线）
  production: {
    // 方案一：使用主域名 API（需要配置 CDN 白名单）
    baseUrl: 'https://yugioh.top/api',
    wsUrl: 'wss://yugioh.top',

    // 方案二：使用专用 API 子域名（推荐，需要先创建子域名）
    // baseUrl: 'https://api.yugioh.top/api',
    // wsUrl: 'wss://api.yugioh.top',

    debug: false,
    useMockData: false,
  },
};
```

---

### 第二步：配置服务器域名白名单（5分钟）

1. **登录微信公众平台**
   - 访问：https://mp.weixin.qq.com/
   - 使用小程序账号登录

2. **进入服务器域名配置**
   - 导航：开发 → 开发管理 → 开发设置 → 服务器域名

3. **添加域名到 request 合法域名**
   ```
   https://yugioh.top
   ```

4. **添加域名到 uploadFile 合法域名**（如果需要）
   ```
   https://yugioh.top
   ```

5. **添加域名到 downloadFile 合法域名**（如果需要）
   ```
   https://yugioh.top
   ```

**重要提示**：
- ✅ 必须使用 HTTPS 协议
- ✅ 域名需要备案
- ✅ 配置生效需要几分钟（最长24小时）

---

### 第三步：重新上传小程序（2分钟）

1. **上传小程序**
   ```bash
   cd /workspace/projects/miniprogram
   node upload-simple.js
   ```

2. **查看上传结果**
   - 如果成功：会显示 `✅ 上传成功！版本: 1.0.xxxxx`
   - 如果失败：检查错误信息

3. **在微信小程序后台提交审核**
   - 登录微信公众平台
   - 进入：版本管理 → 开发版本
   - 点击「提交审核」

---

## 🔄 完整工作流程

### 开发和测试流程

```
1. 本地开发（development环境）
   ↓
   API地址：http://localhost:5000/api
   ↓
   在本地测试（需要微信开发者工具）

2. 生产部署（production环境）
   ↓
   API地址：https://yugioh.top/api
   ↓
   修改配置文件（ENV = 'production'）
   ↓
   上传到微信平台
   ↓
   配置服务器域名白名单
   ↓
   提交审核
   ↓
   发布上线
```

---

## 📝 验证步骤

上传完成后，在手机上测试：

1. **打开小程序**
   - 通过微信搜索或扫描二维码

2. **测试功能**
   - ✅ 账号列表是否正常加载
   - ✅ 账号详情是否正常显示
   - ✅ 筛选功能是否正常工作
   - ✅ 页面跳转是否正常

3. **如果还有问题**
   - 打开微信小程序
   - 点击右上角「...」→「转发」→「转发给好友」
   - 转发给开发人员，让开发人员查看
   - 或者使用 vConsole 查看错误信息（需要在代码中开启）

---

## ⚠️ 常见问题

### Q1: 为什么不能继续使用 localhost？

A: `localhost` 是本地地址，只有您的电脑能访问。小程序运行在用户手机上，无法访问您电脑的 `localhost`。必须使用真实的域名。

---

### Q2: 生产环境API地址是什么？

A: 根据您的配置：
- 方案一：`https://yugioh.top/api`
- 方案二（推荐）：`https://api.yugioh.top/api`（需要先创建子域名）

---

### Q3: 为什么要配置服务器域名白名单？

A: 微信为了安全，默认禁止小程序访问未配置的域名。必须在微信公众平台配置白名单，小程序才能访问您的API。

---

### Q4: 配置域名白名单需要多久生效？

A: 通常几分钟内生效，最慢需要24小时。配置后立即重新上传小程序即可。

---

### Q5: 如果没有备案域名怎么办？

A: 小程序上线必须使用备案域名。如果是测试阶段，可以：
- 使用 Mock 数据测试界面
- 或者使用已备案的域名

---

## 🎯 快速修复命令

如果您确认要立即修复，可以执行以下命令：

```bash
# 1. 修改环境配置
cd /workspace/projects/miniprogram
sed -i "s/const ENV = 'development';/const ENV = 'production';/g" utils/config.js

# 2. 验证修改
cat utils/config.js | grep "const ENV"

# 3. 重新上传小程序
node upload-simple.js
```

---

## 📚 相关文档

- [微信小程序服务器域名配置](https://developers.weixin.qq.com/miniprogram/dev/framework/server-communication.html)
- [miniprogram-ci 上传工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)

---

## ✅ 修复完成检查清单

修复完成后，请验证：

- [ ] 修改了 `utils/config.js` 中的 `ENV` 为 `production`
- [ ] 在微信公众平台配置了服务器域名白名单
- [ ] 重新上传了小程序
- [ ] 在手机上测试，账号列表正常加载
- [ ] 所有功能正常工作

---

## 🚀 下一步

完成上述步骤后：

1. **提交审核**
   - 登录微信公众平台
   - 进入：版本管理 → 开发版本
   - 点击「提交审核」

2. **等待审核通过**
   - 通常 1-3 个工作日
   - 审核通过后，可以点击「发布」

3. **正式上线**
   - 用户即可通过微信搜索找到您的小程序

---

**修复时间**: 2026-02-27 14:55
**优先级**: 🔴 高（必须修复才能正常使用）
**预计修复时间**: 10-15 分钟
