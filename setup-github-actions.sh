#!/bin/bash

# GitHub Actions 快速配置脚本
# 用途：帮助快速配置GitHub Actions实现小程序自动化上传

echo "=================================================="
echo "  GitHub Actions 小程序上传 - 快速配置向导"
echo "=================================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 步骤1：检查Git仓库
echo -e "${YELLOW}[步骤 1/5]${NC} 检查Git仓库..."
if [ -d .git ]; then
    echo -e "${GREEN}✓ Git仓库已存在${NC}"
else
    echo -e "${RED}✗ Git仓库不存在${NC}"
    echo "请先初始化Git仓库: git init"
    exit 1
fi
echo ""

# 步骤2：检查GitHub远程仓库
echo -e "${YELLOW}[步骤 2/5]${NC} 检查GitHub远程仓库..."
if git remote get-url origin >/dev/null 2>&1; then
    REMOTE_URL=$(git remote get-url origin)
    echo -e "${GREEN}✓ 远程仓库已配置${NC}"
    echo "  URL: $REMOTE_URL"
else
    echo -e "${RED}✗ 未配置GitHub远程仓库${NC}"
    echo ""
    echo "请先配置远程仓库："
    echo "  git remote add origin https://github.com/你的用户名/你的仓库名.git"
    echo ""
    echo "或者在GitHub创建新仓库："
    echo "  访问: https://github.com/new"
    echo "  仓库名: miniprogram-game-account-rental"
    echo ""
    exit 1
fi
echo ""

# 步骤3：检查必要文件
echo -e "${YELLOW}[步骤 3/5]${NC} 检查必要文件..."

FILES_OK=true

# 检查GitHub Actions配置
if [ -f ".github/workflows/upload-miniprogram.yml" ]; then
    echo -e "${GREEN}✓ GitHub Actions配置文件存在${NC}"
else
    echo -e "${RED}✗ GitHub Actions配置文件不存在${NC}"
    FILES_OK=false
fi

# 检查上传脚本
if [ -f "miniprogram/upload.js" ]; then
    echo -e "${GREEN}✓ 上传脚本存在${NC}"
else
    echo -e "${RED}✗ 上传脚本不存在${NC}"
    FILES_OK=false
fi

if [ "$FILES_OK" = false ]; then
    echo ""
    echo "缺少必要文件，请检查项目结构"
    exit 1
fi
echo ""

# 步骤4：显示配置信息
echo -e "${YELLOW}[步骤 4/5]${NC} 配置信息..."
echo ""
echo "小程序AppID: twx2382e1949d031ba6"
echo "项目路径: miniprogram/"
echo "配置文件: .github/workflows/upload-miniprogram.yml"
echo ""

# 步骤5：显示操作指南
echo -e "${YELLOW}[步骤 5/5]${NC} 接下来的操作..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. 推送代码到GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "执行命令:"
echo "  cd /workspace/projects"
echo "  git push origin main"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. 在GitHub添加Secret"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "a. 访问仓库设置:"
echo "   https://github.com/$(echo $REMOTE_URL | sed 's|https://github.com/||' | sed 's|\.git$||')/settings/secrets/actions"
echo ""
echo "b. 点击 'New repository secret'"
echo ""
echo "c. 填写信息:"
echo "   Name: MINIPROGRAM_PRIVATE_KEY"
echo "   Value: (私钥文件完整内容)"
echo ""
echo "d. 点击 'Add secret'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. 在微信平台添加IP白名单"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "a. 登录微信公众平台: https://mp.weixin.qq.com"
echo ""
echo "b. 进入: 开发 → 开发管理 → 开发设置"
echo ""
echo "c. 找到 '小程序代码上传' 部分"
echo ""
echo "d. 添加以下IP地址:"
echo "   - 185.199.108.153"
echo "   - 185.199.109.153"
echo "   - 185.199.110.153"
echo "   - 185.199.111.153"
echo ""
echo "e. 保存配置"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. 触发上传"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "方式A - 自动触发（推荐）:"
echo "  执行空提交: git commit --allow-empty -m '触发上传' && git push origin main"
echo ""
echo "方式B - 手动触发:"
echo "  访问: https://github.com/$(echo $REMOTE_URL | sed 's|https://github.com/||' | sed 's|\.git$||')/actions"
echo "  点击 'Run workflow' 按钮"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. 查看上传进度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "访问Actions页面查看运行状态:"
echo "  https://github.com/$(echo $REMOTE_URL | sed 's|https://github.com/||' | sed 's|\.git$||')/actions"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${GREEN}✓ 配置向导完成！${NC}"
echo ""
echo "详细配置指南请查看: GITHUB_ACTIONS_配置指南.md"
echo ""

# 询问是否立即推送
read -p "是否立即推送代码到GitHub？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "正在推送代码..."
    git push origin main
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 代码推送成功！${NC}"
        echo ""
        echo "下一步："
        echo "1. 在GitHub添加Secret（详见上方步骤2）"
        echo "2. 在微信平台添加IP白名单（详见上方步骤3）"
        echo "3. 触发上传（详见上方步骤4）"
    else
        echo -e "${RED}✗ 代码推送失败${NC}"
        echo "请检查远程仓库配置"
    fi
else
    echo ""
    echo "稍后可以执行以下命令推送代码:"
    echo "  cd /workspace/projects"
    echo "  git push origin main"
fi

echo ""
