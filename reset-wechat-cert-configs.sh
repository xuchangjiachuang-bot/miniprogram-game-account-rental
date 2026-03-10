#!/bin/bash

# 重置微信支付证书配置脚本
# 此脚本将清除数据库中的证书相关配置，使其恢复为空值

echo "开始重置微信支付证书配置..."

# 删除证书配置
curl -X POST http://localhost:5000/api/admin/payment/wechat/reset-certs \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=admin_test_token_123" \
  2>&1 | python3 -m json.tool

echo ""
echo "证书配置已重置，请刷新管理后台页面查看效果。"
