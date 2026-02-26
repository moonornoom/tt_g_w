#!/bin/bash
# 阿里云 ECS 部署脚本 - fund-compare
# 适用于: Alibaba Cloud Linux 3 (RHEL 系)
# 服务器: 2vCPU / 2GiB / 40GiB ESSD

set -e

echo "=========================================="
echo "  Fund Compare 部署脚本"
echo "  服务器: $(hostname)"
echo "  时间: $(date)"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ==========================================
# Step 1: 系统优化 (2G内存需要swap)
# ==========================================
log_info "Step 1: 系统优化..."

# 创建 swap 文件 (2G)
if [ ! -f /swapfile ]; then
    log_info "创建 2G swap 文件..."
    sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    log_info "Swap 创建完成"
else
    log_info "Swap 已存在，跳过"
fi

# 设置 swappiness
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# ==========================================
# Step 2: 安装 Node.js 20
# ==========================================
log_info "Step 2: 安装 Node.js 20..."

# 使用阿里云镜像源
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

node --version
npm --version

# 配置 npm 阿里云镜像
npm config set registry https://registry.npmmirror.com

# ==========================================
# Step 3: 安装 PM2
# ==========================================
log_info "Step 3: 安装 PM2..."
sudo npm install -g pm2

# 配置 PM2 开机自启
sudo pm2 startup systemd -u admin --hp /home/admin

# ==========================================
# Step 4: 安装 Nginx
# ==========================================
log_info "Step 4: 安装 Nginx..."
sudo yum install -y nginx

# 启动并设置开机自启
sudo systemctl enable nginx
sudo systemctl start nginx

# ==========================================
# Step 5: 创建应用目录
# ==========================================
log_info "Step 5: 创建应用目录..."
sudo mkdir -p /var/www/fund-compare
sudo chown -R admin:admin /var/www/fund-compare

# ==========================================
# Step 6: 安装 Git (可选)
# ==========================================
log_info "Step 6: 安装 Git..."
sudo yum install -y git

# ==========================================
# Step 7: 配置防火墙
# ==========================================
log_info "Step 7: 配置防火墙..."

# 检查 firewalld 是否运行
if systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-port=80/tcp
    sudo firewall-cmd --permanent --add-port=443/tcp
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
    log_info "Firewalld 规则已添加"
else
    log_warn "Firewalld 未运行，跳过配置"
fi

# ==========================================
# 完成
# ==========================================
echo ""
echo "=========================================="
echo -e "${GREEN}环境安装完成!${NC}"
echo "=========================================="
echo ""
echo "下一步操作:"
echo "1. 上传代码到服务器 (见 deploy-code.sh)"
echo "2. 配置 Nginx (见 nginx.conf)"
echo "3. 启动应用 (见 ecosystem.config.js)"
echo ""
echo "目录结构:"
echo "  /var/www/fund-compare  - 应用目录"
echo "  /etc/nginx/conf.d/     - Nginx 配置"
echo ""
