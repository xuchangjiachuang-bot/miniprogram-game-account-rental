#!/bin/bash

# 微信小程序快速上传脚本
#
# 用法：
#   ./quick-upload.sh [版本号] [描述]
#
# 示例：
#   ./quick-upload.sh 1.0.20260226.2137 "修复TabBar配置错误"
#   ./quick-upload.sh

set -e

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
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MINIPROGRAM_DIR="$PROJECT_DIR/miniprogram"

# 配置
PROJECT_CONFIG="$MINIPROGRAM_DIR/project.config.json"
PRIVATE_KEY="${MINIPROGRAM_PRIVATE_KEY_PATH:-$MINIPROGRAM_DIR/private.key}"

# 打印标题
echo "=========================================="
echo "   微信小程序快速上传工具"
echo "=========================================="
echo ""

# 检查项目配置
if [ ! -f "$PROJECT_CONFIG" ]; then
    log_error "找不到 project.config.json 文件"
    exit 1
fi

# 读取 AppID
APPID=$(grep -o '"appid"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_CONFIG" | grep -o '[^"]*"$' | tr -d '"')

if [ -z "$APPID" ]; then
    log_error "无法读取 AppID"
    exit 1
fi

log_info "AppID: $APPID"

# 检查私钥文件
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
    log_info "6. 设置文件权限：chmod 600 $PRIVATE_KEY"
    echo ""
    log_info "详细说明请参考：AUTO_UPLOAD_CONFIG.md"
    exit 1
fi

# 检查文件权限
PRIVATE_KEY_PERMS=$(stat -c "%a" "$PRIVATE_KEY" 2>/dev/null || stat -f "%A" "$PRIVATE_KEY" 2>/dev/null)
if [ "$PRIVATE_KEY_PERMS" != "600" ]; then
    log_warning "私钥文件权限不安全（当前: $PRIVATE_KEY_PERMS，建议: 600）"
    log_info "运行: chmod 600 $PRIVATE_KEY"
fi

# 获取版本号
VERSION=${1:-$(grep -o '## 版本 [0-9.]*' "$PROJECT_DIR/CHANGELOG.md" | head -1 | grep -o '[0-9.]*' || echo "")}

if [ -z "$VERSION" ]; then
    log_error "请提供版本号"
    echo ""
    log_info "用法："
    log_info "  ./quick-upload.sh [版本号] [描述]"
    echo ""
    log_info "示例："
    log_info "  ./quick-upload.sh 1.0.20260226.2137 '修复TabBar配置错误'"
    exit 1
fi

# 获取描述
DESCRIPTION=${2:-"自动上传版本 $VERSION"}

if [ -z "$DESCRIPTION" ]; then
    # 从 CHANGELOG.md 读取最新描述
    DESCRIPTION=$(grep -A 5 "## 版本 $VERSION" "$PROJECT_DIR/CHANGELOG.md" | grep "修复\|新增" | head -1 | sed 's/-.*//;s/^[[:space:]]*//;s/[[:space:]]*$//' | cut -c1-100 || echo "版本更新")
fi

log_info "版本: $VERSION"
log_info "描述: $DESCRIPTION"
echo ""

# 检查 miniprogram-ci 命令
if ! command -v /usr/bin/miniprogram-ci &> /dev/null; then
    log_error "找不到 miniprogram-ci 命令"
    exit 1
fi

# 执行上传
log_info "开始上传到微信小程序平台..."
echo ""

/usr/bin/miniprogram-ci upload \
    --appid "$APPID" \
    --project-path "$MINIPROGRAM_DIR" \
    --private-key-path "$PRIVATE_KEY" \
    --upload-version "$VERSION" \
    --upload-description "$DESCRIPTION" \
    --use-project-config

UPLOAD_RESULT=$?

echo ""

if [ $UPLOAD_RESULT -eq 0 ]; then
    log_success "上传成功！"
    log_success "版本: $VERSION"
    log_success "描述: $DESCRIPTION"
    echo ""
    log_info "下一步："
    log_info "1. 登录微信小程序后台：https://mp.weixin.qq.com/"
    log_info "2. 进入：版本管理"
    log_info "3. 找到版本 $VERSION"
    log_info "4. 点击'提交审核'"
else
    log_error "上传失败"
    exit 1
fi
