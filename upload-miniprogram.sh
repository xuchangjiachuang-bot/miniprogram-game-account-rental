#!/bin/bash

# 微信小程序快速上传脚本
#
# 用法：
#   ./upload-miniprogram.sh [版本号] [描述]
#
# 示例：
#   ./upload-miniprogram.sh
#   ./upload-miniprogram.sh 1.0.20260226.2152
#   ./upload-miniprogram.sh 1.0.20260226.2152 "修复TabBar配置错误"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 项目目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPLOAD_SCRIPT="$SCRIPT_DIR/upload-wechat-miniprogram.js"

# 检查上传脚本是否存在
if [ ! -f "$UPLOAD_SCRIPT" ]; then
    log_error "找不到上传脚本"
    log_info "脚本路径: $UPLOAD_SCRIPT"
    exit 1
fi

# 打印标题
echo "=========================================="
echo "   微信小程序快速上传"
echo "=========================================="
echo ""

# 检查私钥文件
PRIVATE_KEY="${MINIPROGRAM_PRIVATE_KEY_PATH:-$SCRIPT_DIR/miniprogram/private.key}"

if [ ! -f "$PRIVATE_KEY" ]; then
    log_error "找不到私钥文件"
    log_info "私钥路径: $PRIVATE_KEY"
    echo ""
    log_info "请按以下步骤配置私钥："
    log_info "1. 登录微信小程序后台：https://mp.weixin.qq.com/"
    log_info "2. 进入：开发 -> 开发管理 -> 开发设置"
    log_info "3. 找到'小程序代码上传'部分"
    log_info "4. 点击'生成'或'重置'私钥"
    log_info "5. 下载私钥文件并放置到：$PRIVATE_KEY"
    log_info "6. 设置权限：chmod 600 $PRIVATE_KEY"
    echo ""
    log_info "详细说明请查看：UPLOAD_WECHAT_GUIDE.md"
    exit 1
fi

# 检查文件权限
PRIVATE_KEY_PERMS=$(stat -c "%a" "$PRIVATE_KEY" 2>/dev/null || stat -f "%A" "$PRIVATE_KEY" 2>/dev/null)
if [ "$PRIVATE_KEY_PERMS" != "600" ]; then
    log_warning "私钥文件权限不安全（当前: $PRIVATE_KEY_PERMS，建议: 600）"
    log_info "运行: chmod 600 $PRIVATE_KEY"
fi

# 传递参数给 Node.js 脚本
if [ $# -eq 0 ]; then
    # 无参数，自动生成版本号
    log_info "自动生成版本号..."
    node "$UPLOAD_SCRIPT"
else
    # 有参数，传递给脚本
    node "$UPLOAD_SCRIPT" "$@"
fi
