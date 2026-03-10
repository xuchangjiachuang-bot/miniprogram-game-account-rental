# P0级别核心功能使用文档

## 目录
1. [数据库迁移](#数据库迁移)
2. [自动分账系统](#自动分账系统)
3. [订单超时处理](#订单超时处理)
4. [账号审核机制](#账号审核机制)
5. [上架保证金机制](#上架保证金机制)
6. [综合测试](#综合测试)
7. [常见问题](#常见问题)

---

## 数据库迁移

### 执行迁移脚本

在更新代码后，需要执行数据库迁移脚本来应用schema变更。

```bash
# 方法1: 使用psql命令行
psql -U your_username -d your_database -f migrations/001_add_audit_deposit_timeout_split.sql

# 方法2: 使用数据库管理工具（如pgAdmin、DBeaver等）
# 打开迁移脚本文件并执行
```

### 迁移内容

迁移脚本会执行以下操作：

1. **删除重复字段**：从 `users` 表删除 `balance` 和 `frozen_balance` 字段
2. **添加审核字段**：为 `accounts` 表添加审核相关字段
3. **添加配置字段**：为 `platform_settings` 表添加配置字段
4. **创建群聊表**：创建 `chat_groups`、`chat_group_members`、`chat_messages` 表
5. **创建保证金表**：创建 `account_deposits` 表
6. **更新现有数据**：将现有账号设置为已审核通过状态

### 验证迁移

迁移完成后，检查以下内容：

```sql
-- 检查审核字段是否存在
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'accounts' AND column_name IN ('audit_status', 'deposit_id');

-- 检查保证金表是否存在
SELECT table_name FROM information_schema.tables WHERE table_name = 'account_deposits';

-- 检查群聊表是否存在
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'chat_%';

-- 检查配置字段是否存在
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'platform_settings' AND column_name IN ('listing_deposit_amount', 'order_payment_timeout');
```

---

## 自动分账系统

### 功能说明

订单完成后自动触发分账，计算并分配资金给各方：
- 平台佣金：从租金中扣除
- 卖家收入：租金减去平台佣金和提现手续费
- 买家押金：退还给买家

### 分账逻辑

```
租金 = 100元
押金 = 50元
平台佣金率 = 5%
提现手续费率 = 1%

平台佣金 = 100 × 5% = 5元
卖家毛收入 = 100 - 5 = 95元
提现手续费 = 95 × 1% = 0.95元
卖家净收入 = 95 - 0.95 = 94.05元
买家押金退款 = 50元
```

### API接口

#### 执行自动分账

```http
POST /api/orders/{orderId}/auto-split
```

**响应示例**：
```json
{
  "success": true,
  "message": "自动分账成功",
  "platformCommission": 5,
  "sellerIncome": 94.05,
  "buyerRefund": 50
}
```

#### 获取分账记录

```http
GET /api/orders/{orderId}/auto-split
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "orderNo": "ORD1234567890",
      "receiverType": "seller",
      "receiverId": "uuid",
      "splitAmount": "94.05",
      "status": "success"
    }
  ]
}
```

### 使用场景

1. **订单完成时自动触发**：
```javascript
// 在订单完成逻辑中调用
const result = await executeAutoSplit(orderId);
if (result.success) {
  console.log('分账成功');
}
```

2. **批量处理待分账订单**（定时任务）：
```javascript
const { success, failed } = await processPendingSplits();
console.log(`成功处理 ${success} 个订单，失败 ${failed} 个订单`);
```

---

## 订单超时处理

### 功能说明

自动检查超过30分钟未支付的订单，并取消这些订单，退还用户资金。

### 超时规则

- 默认超时时间：30分钟（1800秒）
- 可在 `platform_settings` 表中配置 `order_payment_timeout` 字段
- 仅对状态为 `pending_payment` 的订单生效

### API接口

#### 获取超时订单列表

```http
GET /api/orders/check-timeout
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "orderNo": "ORD1234567890",
      "status": "pending_payment",
      "createdAt": "2025-01-01T10:00:00Z",
      "totalPrice": "150.00",
      "deposit": "50.00"
    }
  ],
  "timeoutTime": "2025-01-01T10:30:00Z"
}
```

#### 检查并取消超时订单

```http
POST /api/orders/check-timeout
```

**响应示例**：
```json
{
  "success": true,
  "message": "成功取消 3 个超时订单",
  "cancelledCount": 3
}
```

### 使用场景

1. **定时任务**（建议每5分钟执行一次）：
```bash
# 使用cron
*/5 * * * * curl -X POST http://localhost:5000/api/orders/check-timeout

# 使用Node.js定时器
setInterval(async () => {
  const result = await checkAndCancelTimeoutOrders();
  console.log(result.message);
}, 5 * 60 * 1000);
```

---

## 账号审核机制

### 功能说明

账号创建后需要管理员审核通过后才能上架，防止恶意账号发布。

### 审核流程

```
账号创建 → 待审核（pending） → 管理员审核 → 通过/拒绝
                                         ↓
                                    通过：上架（available）
                                    拒绝：已拒绝（rejected）
```

### 账号状态

| 状态 | 说明 | 是否对外展示 |
|------|------|-------------|
| draft | 草稿（待审核） | 否 |
| available | 可用（已审核通过） | 是 |
| rejected | 已拒绝 | 否 |

### 审核状态

| 状态 | 说明 |
|------|------|
| pending | 待审核 |
| approved | 审核通过 |
| rejected | 审核拒绝 |

### API接口

#### 获取待审核账号列表

```http
GET /api/admin/accounts/pending-audit?page=1&pageSize=20
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "total": 5,
    "accounts": [
      {
        "id": "uuid",
        "title": "100M哈夫币Steam账号",
        "auditStatus": "pending",
        "sellerId": "uuid",
        "createdAt": "2025-01-01T10:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20
  }
}
```

#### 审核通过

```http
POST /api/admin/accounts/{accountId}/audit
Content-Type: application/json

{
  "action": "approve",
  "auditUserId": "admin-user-id"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "账号审核通过，已上架",
  "account": {
    "id": "uuid",
    "auditStatus": "approved",
    "status": "available"
  }
}
```

#### 审核拒绝

```http
POST /api/admin/accounts/{accountId}/audit
Content-Type: application/json

{
  "action": "reject",
  "auditUserId": "admin-user-id",
  "reason": "账号信息不完整"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "账号审核已拒绝，保证金已退还",
  "account": {
    "id": "uuid",
    "auditStatus": "rejected",
    "status": "rejected",
    "auditReason": "账号信息不完整"
  }
}
```

#### 获取账号审核状态

```http
GET /api/admin/accounts/{accountId}/audit
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "auditStatus": "approved",
    "auditReason": null,
    "auditUserId": "uuid",
    "auditTime": "2025-01-01T12:00:00Z"
  }
}
```

### 管理后台集成

在管理后台添加待审核账号管理页面：

```javascript
// 获取待审核列表
const response = await fetch('/api/admin/accounts/pending-audit?page=1&pageSize=20');
const { data } = await response.json();

// 审核通过
await fetch(`/api/admin/accounts/${accountId}/audit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'approve',
    auditUserId: currentUserId
  })
});

// 审核拒绝
await fetch(`/api/admin/accounts/${accountId}/audit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'reject',
    auditUserId: currentUserId,
    reason: reason
  })
});
```

---

## 上架保证金机制

### 功能说明

卖家上架账号时需要支付保证金，防止恶意账号发布。账号下架或订单完成后自动退还。

### 保证金流程

```
上架账号 → 冻结保证金 → 审核通过/被拒绝/下架/订单完成
                                     ↓
                          退还保证金（解冻余额）
```

### 保证金状态

| 状态 | 说明 |
|------|------|
| frozen | 已冻结 |
| released | 已释放（退还） |
| confiscated | 已没收（暂未实现） |

### 配置保证金金额

在 `platform_settings` 表中配置 `listing_deposit_amount` 字段（默认50元）。

```sql
UPDATE platform_settings SET listing_deposit_amount = 100;
```

### API接口

#### 获取保证金金额配置

```http
GET /api/settings/listing-deposit
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "amount": 50
  }
}
```

#### 冻结保证金

```http
POST /api/accounts/{accountId}/deposit
Content-Type: application/json

{
  "action": "freeze",
  "userId": "user-id"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "保证金冻结成功，金额￥50",
  "deposit": {
    "accountId": "uuid",
    "userId": "uuid",
    "amount": 50,
    "status": "frozen"
  }
}
```

#### 退还保证金

```http
POST /api/accounts/{accountId}/deposit
Content-Type: application/json

{
  "action": "refund",
  "reason": "cancelled" // cancelled, completed, rejected
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "保证金退还成功，金额￥50，原因：cancelled",
  "deposit": {
    "accountId": "uuid",
    "userId": "uuid",
    "amount": 50,
    "status": "released",
    "refundReason": "cancelled"
  }
}
```

#### 获取账号保证金信息

```http
GET /api/accounts/{accountId}/deposit
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "hasDeposit": true,
    "deposit": {
      "id": "uuid",
      "accountId": "uuid",
      "userId": "uuid",
      "amount": "50.00",
      "status": "frozen",
      "createdAt": "2025-01-01T10:00:00Z"
    }
  }
}
```

### 账号创建集成

账号创建时自动处理保证金（已在 `/api/accounts` POST 接口中集成）：

```javascript
// 1. 创建账号
const newAccount = await createAccount(accountData);

// 2. 冻结保证金
const depositResult = await freezeListingDeposit(newAccount.id, sellerId);

if (!depositResult.success) {
  // 冻结失败，删除账号
  await deleteAccount(newAccount.id);
  throw new Error(depositResult.message);
}

// 3. 提交审核
const auditResult = await submitForAudit(newAccount.id);
```

---

## 综合测试

### 测试页面

访问测试页面：`http://localhost:5000/test-p0-features`

### 测试内容

测试页面包含以下测试模块：

1. **自动分账系统测试**
   - 输入订单ID，执行自动分账
   - 查看分账结果

2. **订单超时处理测试**
   - 获取超时订单列表
   - 检查并取消超时订单

3. **账号审核机制测试**
   - 获取待审核账号列表
   - 审核通过/拒绝账号

4. **上架保证金机制测试**
   - 获取保证金金额配置
   - 冻结/退还保证金

5. **其他功能测试**
   - 获取已审核通过的账号列表

### 测试步骤

1. 准备测试数据：
   - 创建测试用户（确保有足够余额）
   - 创建测试账号
   - 创建测试订单

2. 依次测试各个功能模块

3. 验证数据库数据是否正确更新

### 注意事项

- 测试前确保已执行数据库迁移脚本
- 确保有足够的测试数据
- 测试保证金功能时，确保用户余额充足

---

## 常见问题

### Q1: 数据库迁移失败怎么办？

**A**: 检查以下几点：
- 确保数据库连接正常
- 检查是否有权限执行DDL语句
- 查看迁移脚本的错误日志
- 如果字段已存在，脚本会自动跳过

### Q2: 保证金冻结失败提示余额不足？

**A**: 检查以下几点：
- 确认用户在 `user_balances` 表中有记录
- 确认 `available_balance` 字段值足够支付保证金
- 保证金金额可在 `platform_settings.listing_deposit_amount` 配置

### Q3: 订单超时没有自动取消？

**A**: 检查以下几点：
- 确认订单状态是 `pending_payment`
- 确认订单创建时间已超过配置的超时时间
- 确认 `order_payment_timeout` 配置正确（单位：秒）
- 检查定时任务是否正常运行

### Q4: 审核通过后账号还是没有上架？

**A**: 检查以下几点：
- 确认 `accounts.audit_status` 为 `approved`
- 确认 `accounts.status` 为 `available`
- 确认账号列表查询时过滤了 `auditStatus='approved'`

### Q5: 分账后余额没有变化？

**A**: 检查以下几点：
- 确认订单状态是 `completed`
- 确认 `user_balances` 表中有对应用户记录
- 检查 `balance_transactions` 表是否有分账记录
- 检查是否有错误日志

### Q6: 如何查看所有待分账的订单？

**A**: 执行以下SQL：
```sql
SELECT o.*, COUNT(sr.id) as split_count
FROM orders o
LEFT JOIN split_records sr ON o.id = sr.orderId
WHERE o.status = 'completed'
GROUP BY o.id
HAVING COUNT(sr.id) = 0;
```

### Q7: 如何批量审核账号？

**A**: 使用 `batchAuditAccounts` 函数（需要在后端实现API接口）：
```javascript
const result = await batchAuditAccounts(
  ['account-id-1', 'account-id-2', 'account-id-3'],
  'admin-user-id',
  'approve' // 或 'reject'
);
```

### Q8: 如何修改保证金金额？

**A**: 执行以下SQL：
```sql
UPDATE platform_settings SET listing_deposit_amount = 100;
```

### Q9: 如何修改订单超时时间？

**A**: 执行以下SQL（单位：秒）：
```sql
UPDATE platform_settings SET order_payment_timeout = 3600; -- 1小时
```

### Q10: 如何查看账号保证金历史？

**A**: 查询 `account_deposits` 表：
```sql
SELECT * FROM account_deposits WHERE account_id = 'your-account-id' ORDER BY created_at DESC;
```

---

## 技术支持

如有问题，请联系技术支持团队或查阅以下资源：

- 项目代码：`src/lib/` 目录下的服务文件
- API文档：各个路由文件中的注释
- 测试页面：`/test-p0-features`

---

## 更新日志

### v1.1.0 (2025-01-06)

**新增功能**：
- ✅ 自动分账系统
- ✅ 订单超时处理
- ✅ 账号审核机制
- ✅ 上架保证金机制
- ✅ 群聊数据库支持

**优化内容**：
- ✅ 修复数据库表结构重复问题
- ✅ 统一使用 `userBalances` 表管理用户余额
- ✅ 添加配置化管理（保证金金额、超时时间等）

**新增文件**：
- `src/lib/auto-split-service.ts`
- `src/lib/order-timeout-service.ts`
- `src/lib/account-audit-service.ts`
- `src/lib/account-deposit-service.ts`
- `src/lib/db.ts`
- `migrations/001_add_audit_deposit_timeout_split.sql`
- `src/app/test-p0-features/page.tsx`

---

## 附录

### A. 数据库表结构

#### account_deposits（账号保证金记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| account_id | UUID | 账号ID |
| user_id | UUID | 用户ID |
| amount | NUMERIC(10,2) | 保证金金额 |
| status | VARCHAR(20) | 状态（frozen/released/confiscated） |
| refund_reason | VARCHAR(50) | 退还原因 |
| refunded_at | TIMESTAMP | 退还时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### split_records（分账记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| order_id | VARCHAR(36) | 订单ID |
| order_no | VARCHAR(32) | 订单号 |
| receiver_type | VARCHAR(20) | 接收方类型（seller/platform/buyer） |
| receiver_id | VARCHAR(36) | 接收方ID |
| split_amount | NUMERIC(10,2) | 分账金额 |
| split_ratio | NUMERIC(5,2) | 分账比例 |
| commission_type | VARCHAR(50) | 佣金类型 |
| status | VARCHAR(20) | 状态 |
| split_time | TIMESTAMP | 分账时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### B. 配置参数

#### platform_settings 新增配置

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| listing_deposit_amount | NUMERIC(10,2) | 50.00 | 上架保证金金额 |
| order_payment_timeout | INTEGER | 1800 | 订单支付超时时间（秒） |

### C. 账号状态流转图

```
账号创建 → draft（草稿） → pending（待审核）
                                 ↓
                    ┌───────┴───────┐
                    ↓               ↓
                approved         rejected
                    ↓               ↓
               available       （退还保证金）
                    ↓
               （冻结保证金）

订单完成 → completed → 触发自动分账
账号下架 → cancelled → 退还保证金
审核拒绝 → rejected → 退还保证金
```
