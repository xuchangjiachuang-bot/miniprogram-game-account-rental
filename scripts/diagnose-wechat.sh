#!/bin/bash
# 微信小程序配置诊断脚本

echo "🔍 微信小程序配置诊断"
echo "=================================="
echo ""

# 测试API响应
echo "1. 测试登录API响应..."
echo "-----------------------------------"
response=$(curl -s -X POST https://hfb.yugioh.top/api/auth/miniprogram \
  -H 'Content-Type: application/json' \
  -d '{"code":"test_code"}' 2>&1)

echo "$response"
echo ""

# 提取IP地址
echo "2. 提取请求IP地址..."
echo "-----------------------------------"
ip=$(echo "$response" | grep -o "invalid ip [0-9.]*" | cut -d' ' -f3)
if [ -n "$ip" ]; then
    echo "请求IP: $ip"
else
    echo "未找到IP地址"
fi
echo ""

# 检查是否为白名单错误
echo "3. 检查错误类型..."
echo "-----------------------------------"
if echo "$response" | grep -q "not in whitelist"; then
    echo "❌ 错误：IP不在白名单中"
    echo ""
    echo "📋 解决方案："
    echo "1. 登录 https://mp.weixin.qq.com"
    echo "2. 进入：开发 → 开发管理 → 开发设置"
    echo "3. 找到：服务器IP白名单（不是服务器域名！）"
    echo "4. 添加IP地址：$ip"
    echo "5. 保存并等待5-10分钟"
elif echo "$response" | grep -q "invalid code"; then
    echo "✅ IP白名单配置成功！"
    echo "   （返回40029 invalid code是正常的，因为code是测试值）"
elif echo "$response" | grep -q "获取微信授权失败"; then
    echo "⚠️  其他授权失败"
    echo "   请检查AppID和AppSecret配置"
else
    echo "❓ 未知错误"
fi
echo ""

# 提取IPv6地址
echo "4. 提取IPv6地址..."
echo "-----------------------------------"
ipv6=$(echo "$response" | grep -o "ipv6 ::ffff:[0-9.]*" | cut -d' ' -f2)
if [ -n "$ipv6" ]; then
    echo "IPv6地址: $ipv6"
    echo ""
    echo "💡 提示：有些情况下微信会检查IPv6地址"
    echo "   如果配置IPv4后仍然失败，可能需要配置IPv6"
fi
echo ""

echo "=================================="
echo "📋 配置清单"
echo "=================================="
echo ""
echo "✅ 必须配置的项目："
echo "   1. 服务器域名 → request合法域名："
echo "      https://hfb.yugioh.top"
echo ""
echo "   2. 服务器IP白名单（注意：不是域名！）："
echo "      $ip"
echo ""
echo "⚠️  常见错误："
echo "   - 只配置了request域名，没有配置IP白名单"
echo "   - 配置位置错误（应该在"服务器IP白名单"，不是"服务器域名"）"
echo "   - IP地址配置错误（复制粘贴错误）"
echo "   - 配置后没有等待生效时间"
echo ""
echo "=================================="
echo "🔗 参考链接"
echo "=================================="
echo "微信小程序IP白名单配置指南："
echo "https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/ip-whitelist.html"
echo ""
