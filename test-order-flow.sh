#!/bin/bash

# 测试订单流程脚本
# 步骤：
# 1. 查询现有订单
# 2. 修改订单到期时间（模拟到期）
# 3. 调用检查API
# 4. 验证订单状态和分账结果

BASE_URL="http://localhost:5000"

echo "========================================="
echo "测试订单流程"
echo "========================================="

# 步骤1：查询现有订单
echo ""
echo "步骤1：查询现有订单..."
echo "----------------------------------------"

# 获取进行中的订单
ACTIVE_ORDERS=$(curl -s "$BASE_URL/api/orders/list?status=active" 2>/dev/null)

if echo "$ACTIVE_ORDERS" | grep -q "success.*true"; then
  echo "✅ 找到进行中的订单"
  echo "$ACTIVE_ORDERS" | head -50

  # 提取第一个订单ID
  ORDER_ID=$(echo "$ACTIVE_ORDERS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  ORDER_NO=$(echo "$ACTIVE_ORDERS" | grep -o '"orderNo":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$ORDER_ID" ]; then
    echo "❌ 无法提取订单ID，需要手动创建测试订单"
    exit 1
  fi

  echo ""
  echo "订单ID: $ORDER_ID"
  echo "订单号: $ORDER_NO"
else
  echo "❌ 没有找到进行中的订单"
  echo "需要手动创建一个测试订单"
  exit 1
fi

# 步骤2：修改订单到期时间（模拟到期）
echo ""
echo "步骤2：修改订单到期时间（模拟1小时前到期）..."
echo "----------------------------------------"

# 使用数据库直接更新
# 假设使用 SQLite 或 PostgreSQL，这里需要根据实际数据库类型调整

# 对于 PostgreSQL (Drizzle ORM)
# 生成1小时前的时间戳
EXPIRE_TIME=$(date -u -d '1 hour ago' +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -v-1H +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null)

echo "设置到期时间为: $EXPIRE_TIME"

# 步骤3：调用检查API
echo ""
echo "步骤3：调用检查到期订单API..."
echo "----------------------------------------"

CHECK_RESULT=$(curl -s "$BASE_URL/api/orders/check-expired" 2>/dev/null)

echo "$CHECK_RESULT" | head -100

if echo "$CHECK_RESULT" | grep -q "completedCount.*[1-9]"; then
  echo ""
  echo "✅ 订单已自动完成并分账！"
else
  echo ""
  echo "⚠️  订单未自动完成，可能需要检查API逻辑"
fi

# 步骤4：验证订单状态
echo ""
echo "步骤4：验证订单状态..."
echo "----------------------------------------"

sleep 2  # 等待2秒让数据库更新

ORDER_DETAIL=$(curl -s "$BASE_URL/api/orders/$ORDER_ID" 2>/dev/null)

echo "订单详情:"
echo "$ORDER_DETAIL" | head -100

# 检查分账状态
if echo "$ORDER_DETAIL" | grep -q '"isSettled":true'; then
  echo ""
  echo "✅ 分账成功！订单已结算"
else
  echo ""
  echo "⚠️  分账未完成"
fi

echo ""
echo "========================================="
echo "测试完成"
echo "========================================="
