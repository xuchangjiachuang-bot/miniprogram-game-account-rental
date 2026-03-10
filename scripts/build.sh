#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

# ========================================
# 自动加载环境变量
# ========================================
echo "🔧 加载环境变量..."

# 设置默认环境变量（如果未配置）
set_default_env() {
    local var_name=$1
    local default_value=$2
    if [ -z "${!var_name:-}" ]; then
        echo "⚙️  设置默认值: ${var_name}"
        export ${var_name}="${default_value}"
    fi
}

# 优先级：环境变量 > .env.production > .env.local > .env > 默认值
if [ -f ".env.production" ]; then
    echo "✅ 加载 .env.production"
    export $(cat .env.production | grep -v '^#' | grep -v '^$' | xargs)
elif [ -f ".env.local" ]; then
    echo "✅ 加载 .env.local"
    export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)
elif [ -f ".env" ]; then
    echo "✅ 加载 .env"
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
    echo "⚠️  未找到环境变量文件，使用默认配置"
fi

# 设置默认环境变量
set_default_env "WECHAT_MINIPROGRAM_APP_ID" "wx2382e1949d031ba6"
set_default_env "WECHAT_MINIPROGRAM_APP_SECRET" "f00d1a872e63be6e72b7ccc63eaa8a2d"
set_default_env "NEXT_PUBLIC_BASE_URL" "http://127.0.0.1:5000"
set_default_env "PGDATABASE_URL" "postgresql://user_7602973286103941146:6d1a5e86-6de8-4164-a92d-73b867d5e94a@cp-sharp-tower-5511e9e0.pg4.aidap-global.cn-beijing.volces.com:5432/Database_1770207199429?sslmode=require&channel_binding=require"
set_default_env "INTERNAL_API_URL" "http://localhost:5000"
set_default_env "NODE_ENV" "production"

# 验证必需的环境变量
echo "🔍 验证环境变量..."

if [ -z "${WECHAT_MINIPROGRAM_APP_ID:-}" ]; then
    echo "❌ 错误：未配置 WECHAT_MINIPROGRAM_APP_ID"
    echo "💡 请在环境变量文件中添加：WECHAT_MINIPROGRAM_APP_ID=wx2382e1949d031ba6"
    exit 1
fi

if [ -z "${WECHAT_MINIPROGRAM_APP_SECRET:-}" ]; then
    echo "❌ 错误：未配置 WECHAT_MINIPROGRAM_APP_SECRET"
    echo "💡 请在环境变量文件中添加：WECHAT_MINIPROGRAM_APP_SECRET=f00d1a872e63be6e72b7ccc63eaa8a2d"
    exit 1
fi

if [ -z "${PGDATABASE_URL:-}" ]; then
    echo "❌ 错误：未配置 PGDATABASE_URL"
    echo "💡 请在环境变量文件中添加：PGDATABASE_URL=postgresql://..."
    exit 1
fi

echo "✅ 环境变量验证通过"
echo "   AppID: ${WECHAT_MINIPROGRAM_APP_ID}"
echo "   BaseURL: ${NEXT_PUBLIC_BASE_URL}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the project with webpack..."
npx next build --webpack

echo "Build completed successfully!"
