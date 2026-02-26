#!/bin/bash
# 代码部署脚本 - 在服务器上执行
# 用法: ./deploy-code.sh [git-repo-url]

set -e

APP_DIR="/var/www/fund-compare"
REPO_URL="${1:-}"

echo "=========================================="
echo "  部署 Fund Compare 代码"
echo "=========================================="

cd $APP_DIR

# 方式1: Git Clone (推荐)
if [ -n "$REPO_URL" ]; then
    echo "[INFO] 从 Git 仓库拉取代码..."
    if [ -d ".git" ]; then
        git pull origin main
    else
        git clone $REPO_URL .
    fi
fi

# 方式2: 如果代码已手动上传，跳过 git

# 安装依赖
echo "[INFO] 安装依赖..."
npm install --production=false

# 创建日志目录
mkdir -p logs

# 构建
echo "[INFO] 构建项目..."
npm run build

# 复制 PM2 配置
cp deploy/ecosystem.config.js .

# 重启服务
echo "[INFO] 重启 PM2 服务..."
pm2 delete fund-compare 2>/dev/null || true
pm2 start ecosystem.config.js

# 保存 PM2 进程列表
pm2 save

echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "查看状态: pm2 status"
echo "查看日志: pm2 logs fund-compare"
echo "重启服务: pm2 restart fund-compare"
echo ""
