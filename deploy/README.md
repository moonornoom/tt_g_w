# Fund Compare 部署指南

## 服务器信息

| 项目 | 配置 |
|------|------|
| 云服务商 | 阿里云 ECS |
| 操作系统 | Alibaba Cloud Linux 3 |
| CPU | 2 vCPU |
| 内存 | 2 GiB |
| 磁盘 | 40 GiB ESSD |
| 公网 IP | 8.162.28.217 |

## 部署步骤

### 方式一：首次部署（服务器初始化）

**1. SSH 连接服务器**

```bash
ssh admin@8.162.28.217
```

**2. 下载并执行初始化脚本**

```bash
# 下载脚本（或手动创建）
curl -o setup-server.sh https://your-url/setup-server.sh

# 添加执行权限
chmod +x setup-server.sh

# 执行
./setup-server.sh
```

**3. 配置 Nginx**

```bash
# 创建 Nginx 配置
sudo vim /etc/nginx/conf.d/fund-compare.conf

# 粘贴 deploy/nginx.conf 内容

# 测试配置
sudo nginx -t

# 重载配置
sudo nginx -s reload
```

**4. 上传代码**

在本地 Windows 执行：

```powershell
cd D:\opencode\fund-compare\deploy
.\upload.ps1
```

或手动上传：

```powershell
# 本地构建
npm run build

# 上传
scp -r D:\opencode\fund-compare admin@8.162.28.217:/var/www/
```

**5. 服务器上安装依赖并启动**

```bash
cd /var/www/fund-compare
npm install --production=false
cp deploy/ecosystem.config.js .
pm2 start ecosystem.config.js
pm2 save
```

---

### 方式二：快速部署（已有环境）

```bash
# 1. 上传代码后
cd /var/www/fund-compare
npm install --production=false
npm run build
pm2 restart fund-compare
```

---

## 常用命令

### PM2 管理

```bash
pm2 status              # 查看状态
pm2 logs fund-compare   # 查看日志
pm2 restart fund-compare # 重启
pm2 stop fund-compare   # 停止
pm2 monit               # 监控面板
```

### Nginx 管理

```bash
sudo nginx -t           # 测试配置
sudo nginx -s reload    # 重载配置
sudo systemctl status nginx  # 状态
sudo tail -f /var/log/nginx/fund-compare.access.log  # 访问日志
```

### 系统监控

```bash
free -h                 # 内存
df -h                   # 磁盘
top                     # 进程
htop                    # 增强版进程监控（需安装）
```

---

## 阿里云安全组配置

确保在阿里云控制台开放以下端口：

| 端口 | 协议 | 说明 |
|------|------|------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP |
| 443 | TCP | HTTPS |
| 3000 | TCP | Node.js（调试用，可选关闭）|

---

## 内存优化说明

2GiB 内存较紧张，已做以下优化：

1. **启用 2G Swap** - 防止 OOM
2. **Node.js 内存限制 384M** - `--max-old-space-size=384`
3. **PM2 单实例** - 避免 fork 多进程
4. **Nginx 静态缓存** - 减少后端请求

---

## 故障排查

### 502 Bad Gateway

```bash
# 检查 PM2 是否运行
pm2 status

# 检查端口
netstat -tlnp | grep 3000

# 查看错误日志
pm2 logs fund-compare --err
```

### 内存不足

```bash
# 检查内存
free -h

# 检查 swap
swapon --show

# 清理缓存
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

### Nginx 错误

```bash
# 查看错误日志
sudo tail -f /var/log/nginx/fund-compare.error.log

# 检查 SELinux（如果启用）
getenforce
# 如果是 Enforcing，临时关闭
sudo setenforce 0
```

---

## 文件结构

```
/var/www/fund-compare/
├── app/                 # Next.js 页面
├── components/          # 组件
├── lib/                 # 工具库
├── public/              # 静态资源
├── deploy/              # 部署脚本
├── logs/                # 日志目录
├── ecosystem.config.js  # PM2 配置
├── .env                 # 环境变量（敏感）
└── .env.example         # 环境变量示例
```

---

## HTTPS 配置（可选）

使用 Let's Encrypt 免费证书：

```bash
# 安装 certbot
sudo yum install -y certbot python3-certbot-nginx

# 申请证书（需要域名）
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo systemctl enable certbot-renew.timer
```
