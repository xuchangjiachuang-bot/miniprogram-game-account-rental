#!/bin/bash
set -Eeuo pipefail

# ========================================
# 环境变量快速设置脚本
# ========================================
# 用途：一键创建 .env.production 文件
# 使用：bash scripts/setup-env.sh

echo "🚀 开始设置环境变量..."
echo ""

# 检查是否已存在 .env.production
if [ -f ".env.production" ]; then
    read -p "⚠️  .env.production 文件已存在，是否覆盖？(y/N): " overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo "❌ 操作已取消"
        exit 0
    fi
    echo ""
fi

# 从模板复制
echo "📝 从模板创建 .env.production 文件..."
cp .env.production.example .env.production

echo "✅ .env.production 文件已创建"
echo ""

# 显示关键配置
echo "📋 已配置的环境变量："
echo "==================================="
echo "WECHAT_MINIPROGRAM_APP_ID=$(grep 'WECHAT_MINIPROGRAM_APP_ID=' .env.production | cut -d'=' -f2)"
echo "WECHAT_MINIPROGRAM_APP_SECRET=$(grep 'WECHAT_MINIPROGRAM_APP_SECRET=' .env.production | cut -d'=' -f2 | sed 's/./**/g')"
echo "NEXT_PUBLIC_BASE_URL=$(grep 'NEXT_PUBLIC_BASE_URL=' .env.production | cut -d'=' -f2)"
echo "==================================="
echo ""

echo "💡 提示："
echo "   1. 如果需要修改配置，请编辑 .env.production 文件"
echo "   2. 配置文件已自动添加到 .gitignore，不会被提交到 Git"
echo "   3. 部署时会自动加载此文件"
echo ""

# 验证关键配置
echo "🔍 验证配置..."

if grep -q "wx2382e1949d031ba6" .env.production; then
    echo "✅ 小程序 AppID 已配置"
else
    echo "⚠️  小程序 AppID 未配置"
fi

if grep -q "f00d1a872e63be6e72b7ccc63eaa8a2d" .env.production; then
    echo "✅ 小程序 AppSecret 已配置"
else
    echo "⚠️  小程序 AppSecret 未配置"
fi

if grep -q "hfb.yugioh.top" .env.production; then
    echo "✅ 应用基础 URL 已配置"
else
    echo "⚠️  应用基础 URL 未配置"
fi

echo ""
echo "✅ 环境变量设置完成！"
echo ""
echo "📝 下一步操作："
echo "   1. 查看配置: cat .env.production"
echo "   2. 修改配置: nano .env.production"
echo "   3. 测试构建: bash scripts/build.sh"
echo "   4. 提交代码: git add . && git commit -m 'chore: 添加环境变量配置'"
echo "   5. 部署应用: 在 Coze 平台重新部署"
