#!/bin/bash

# 微信小程序自动上传脚本
# 使用方法: ./scripts/upload-miniprogram.sh [version] [desc]
# 示例: ./scripts/upload-miniprogram.sh 1.0.1 "修复bug"

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 加载配置文件
CONFIG_FILE="$PROJECT_ROOT/miniprogram-upload.config"
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "配置文件不存在: $CONFIG_FILE"
    log_info "请先创建配置文件 miniprogram-upload.config"
    exit 1
fi

source "$CONFIG_FILE"

# 检查必要配置
if [ -z "$APP_ID" ]; then
    log_error "请配置 APP_ID"
    exit 1
fi

if [ -z "$PROJECT_PATH" ]; then
    log_error "请配置 PROJECT_PATH"
    exit 1
fi

# 转换为绝对路径
PROJECT_FULL_PATH="$PROJECT_ROOT/$PROJECT_PATH"

# 检查项目路径是否存在
if [ ! -d "$PROJECT_FULL_PATH" ]; then
    log_error "项目路径不存在: $PROJECT_FULL_PATH"
    exit 1
fi

# 检查开发者工具路径
CLI_PATH_ABS=""
if [ -f "$CLI_PATH" ]; then
    CLI_PATH_ABS="$CLI_PATH"
else
    # 尝试自动查找
    if [[ "$OSTYPE" == "darwin"* ]]; then
        CLI_PATH_ABS="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        CLI_PATH_ABS="/opt/wechat-web-devtools/cli"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        CLI_PATH_ABS="C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat"
    fi

    if [ ! -f "$CLI_PATH_ABS" ]; then
        log_error "无法找到微信开发者工具CLI"
        log_info "请在配置文件中设置正确的 CLI_PATH"
        exit 1
    fi
fi

log_info "使用CLI路径: $CLI_PATH_ABS"

# 生成版本号
generate_version() {
    local version=""
    if [ "$VERSION_TYPE" == "auto" ]; then
        # 自动生成版本号
        if [ -f "$VERSION_FILE" ]; then
            current_version=$(cat "$VERSION_FILE")
            # 提取版本号末尾数字并+1
            build_number=$(echo "$current_version" | grep -oE '[0-9]+$' || echo "0")
            build_number=$((build_number + 1))
            version="${VERSION_PREFIX}${build_number}"
        else
            version="${VERSION_PREFIX}0"
        fi
    else
        version="$VERSION_PREFIX"0
    fi

    echo "$version"
}

# 获取版本号
VERSION="$1"
if [ -z "$VERSION" ]; then
    VERSION=$(generate_version)
fi

# 保存版本号
echo "$VERSION" > "$VERSION_FILE"

# 获取上传描述
UPLOAD_DESC="$2"
if [ -z "$UPLOAD_DESC" ]; then
    # 自动生成描述
    UPLOAD_DESC="${UPLOAD_DESC_PREFIX} $(date '+%Y-%m-%d %H:%M:%S')"
fi

log_info "========== 微信小程序上传 =========="
log_info "小程序ID: $APP_ID"
log_info "项目路径: $PROJECT_FULL_PATH"
log_info "版本号: $VERSION"
log_info "上传描述: $UPLOAD_DESC"
log_info "======================================"

# 确认上传
echo -n "确认上传? (y/N): "
read -r confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log_warn "上传已取消"
    exit 0
fi

log_info "开始上传..."

# 执行上传命令
UPLOAD_CMD="$CLI_PATH_ABS \
    --upload \
    --project \"$PROJECT_FULL_PATH\" \
    --version \"$VERSION\" \
    --desc \"$UPLOAD_DESC\""

if eval $UPLOAD_CMD; then
    log_success "上传成功!"
    log_info "版本号: $VERSION"
    log_info "上传描述: $UPLOAD_DESC"
    log_info "请到微信公众平台查看审核进度"
    exit 0
else
    log_error "上传失败!"
    log_error "请检查:"
    log_error "1. 微信开发者工具是否已登录"
    log_error "2. 项目路径是否正确"
    log_error "3. APP_ID 是否配置正确"
    exit 1
fi
