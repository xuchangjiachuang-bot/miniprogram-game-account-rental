# 企业微信客服系统实装总结

## 📋 检查结果

### 问题分析

1. **管理后台配置页面**：存在但仅保存到内存，未保存到数据库
2. **前端客服悬浮按钮**：存在但硬编码，未从后端读取配置
3. **配置与按钮关联**：**未关联**，两者独立运行
4. **API 路由**：不存在，无法获取或保存配置

## ✅ 已完成的工作

### 1. 数据库表创建

新增 `wecom_customer_service` 表，存储企业微信客服配置：

```sql
CREATE TABLE "wecom_customer_service" (
  "id" uuid PRIMARY KEY,
  "corp_id" varchar(50) NOT NULL,
  "agent_id" varchar(20) NOT NULL,
  "secret" text NOT NULL,
  "token" varchar(100) NOT NULL,
  "encoding_aes_key" varchar(100) NOT NULL,
  "kf_id" varchar(50) NOT NULL,
  "kf_name" varchar(100) NOT NULL,
  "kf_avatar" varchar(500),
  "kf_qr_code" varchar(500),
  "auto_reply" boolean DEFAULT true,
  "welcome_message" text NOT NULL,
  "offline_message" text NOT NULL,
  "busy_message" text NOT NULL,
  "show_on_homepage" boolean DEFAULT true,
  "show_on_order_page" boolean DEFAULT true,
  "show_on_seller_page" boolean DEFAULT true,
  "floating_button_enabled" boolean DEFAULT true,
  "floating_button_position" varchar(10) DEFAULT 'right',
  "floating_button_color" varchar(20) DEFAULT '#07C160',
  "status" varchar(20) DEFAULT 'online',
  "is_enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
```

### 2. API 路由创建

#### 公开 API（前端使用）
- `GET /api/customer-service/config` - 获取客服配置（不包含敏感信息）

#### 管理 API（管理后台使用）
- `GET /api/admin/customer-service/config` - 获取完整配置
- `PUT /api/admin/customer-service/config` - 保存配置

### 3. 前端客服组件库

创建 `src/components/customer-service-button.tsx`，提供：

- **动态配置读取**：从后端获取客服配置
- **状态显示**：在线、离线、忙碌三种状态
- **悬浮按钮**：支持自定义位置、颜色
- **聊天窗口**：显示欢迎消息、客服二维码
- **常见问题**：快捷按钮功能
- **页面控制**：支持在不同页面显示/隐藏

### 4. 管理后台更新

更新 `src/app/admin/wecom-customer-service/page.tsx`：

- 从数据库加载配置
- 保存配置到数据库
- 使用 API 路由进行数据交互

### 5. 配置字段说明

| 字段 | 说明 |
|------|------|
| corpId | 企业ID |
| agentId | 应用ID |
| secret | 应用密钥 |
| token | 回调验证令牌 |
| encodingAESKey | 消息加密密钥 |
| kfId | 客服ID |
| kfName | 客服名称 |
| kfAvatar | 客服头像 |
| kfQrCode | 客服二维码 |
| welcomeMessage | 欢迎消息 |
| offlineMessage | 离线消息 |
| busyMessage | 忙碌消息 |
| autoReply | 自动回复开关 |
| showOnHomepage | 首页显示 |
| showOnOrderPage | 订单页显示 |
| showOnSellerPage | 卖家页显示 |
| floatingButtonEnabled | 悬浮按钮启用 |
| floatingButtonPosition | 悬浮按钮位置 |
| floatingButtonColor | 悬浮按钮颜色 |
| status | 客服状态 |
| isEnabled | 客服启用 |

## 🎯 使用方法

### 1. 在管理后台配置

1. 登录管理后台
2. 进入"企业微信客服系统"页面
3. 填写企业微信配置信息
4. 设置客服信息和显示规则
5. 保存配置

### 2. 在前端使用

在需要显示客服的页面引入组件：

```tsx
import { CustomerServiceButton } from '@/components/customer-service-button';

// 在页面中使用
<CustomerServiceButton pageType="homepage" />
```

**pageType 参数**：
- `homepage` - 仅在首页显示
- `order` - 仅在订单页显示
- `seller` - 仅在卖家页显示
- `all` - 在所有页面显示（默认）

### 3. 配置企业微信

#### 获取企业微信信息

1. 登录企业微信管理后台
2. 进入"应用管理" → "应用"
3. 选择或创建应用
4. 获取 CorpID、AgentID、Secret
5. 配置接收消息服务器
6. 获取 Token 和 EncodingAESKey

#### 获取客服信息

1. 进入"应用管理" → "企业微信客服"
2. 创建客服账号
3. 获取客服ID和二维码
4. 配置欢迎语和自动回复

## 🔒 安全特性

### 1. 敏感信息保护

- 公开 API 不返回敏感信息（secret、token、encodingAESKey）
- 管理 API 需要管理员权限
- 配置存储在数据库中，可加密

### 2. 访问控制

- 管理 API 受权限保护
- 公开 API 可匿名访问
- 前端组件自动加载配置

## 📊 配置状态

客服支持三种状态：

1. **在线**：正常接待用户，显示绿色
2. **离线**：不接待用户，显示灰色
3. **忙碌**：限制接待用户，显示橙色

## 📱 显示控制

### 页面级别控制

- **首页**：可单独控制
- **订单页**：可单独控制
- **卖家页**：可单独控制

### 悬浮按钮控制

- **启用/禁用**：是否显示悬浮按钮
- **位置**：左侧或右侧
- **颜色**：自定义颜色

## 📁 新增/修改的文件

### 新增文件

1. `src/app/api/customer-service/config/route.ts` - 公开配置 API
2. `src/app/api/admin/customer-service/config/route.ts` - 管理配置 API
3. `src/components/customer-service-button.tsx` - 客服组件库

### 修改文件

1. `src/storage/database/shared/schema.ts` - 新增 wecom_customer_service 表
2. `src/app/admin/wecom-customer-service/page.tsx` - 保存配置到数据库

## 🧪 测试建议

### 1. 配置测试

1. 在管理后台填写配置
2. 保存配置
3. 刷新页面，确认配置已保存

### 2. 显示测试

1. 在不同页面引入客服组件
2. 确认客服按钮显示
3. 测试悬浮按钮点击
4. 测试聊天窗口显示

### 3. 状态测试

1. 切换客服状态（在线/离线/忙碌）
2. 确认按钮颜色变化
3. 确认消息内容变化

### 4. 显示控制测试

1. 测试页面显示控制
2. 测试悬浮按钮开关
3. 测试位置切换
4. 测试颜色切换

## ⚠️ 注意事项

### 1. 配置优先级

数据库配置优先于硬编码配置，确保配置已保存到数据库。

### 2. 企业微信配置

- 需要在企业微信管理后台配置应用
- 需要配置回调服务器
- 需要获取客服ID和二维码

### 3. 显示控制

- 确保在需要的页面引入客服组件
- 使用正确的 pageType 参数
- 确认配置中启用了对应页面显示

### 4. 客服二维码

- 确保二维码图片可访问
- 二维码用于用户扫码添加客服
- 建议使用企业微信客服二维码

## 🔗 相关链接

- 企业微信管理后台：https://work.weixin.qq.com
- 企业微信客服系统：https://work.weixin.qq.com/kfid
- 管理后台客服配置：`/admin/wecom-customer-service`
- 客服配置 API：`/api/customer-service/config`

## 🎉 完成情况

- ✅ 数据库表创建
- ✅ API 路由创建
- ✅ 前端客服组件库
- ✅ 管理后台配置保存
- ✅ 配置与按钮关联
- ✅ 状态管理
- ✅ 显示控制
- ✅ 安全保护

---

**更新时间**: 2024年
**更新内容**: 实装企业微信客服系统，实现配置与前端按钮的关联
