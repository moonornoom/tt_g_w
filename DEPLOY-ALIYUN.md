# 阿里云服务器部署指南

> 本文档记录了基金对比工具在阿里云 ECS 上的完整部署流程

## 服务器信息

| 项目 | 值 |
|------|-----|
| 实例 ID | b8607816def84299b8e04bf89fa99730 |
| 公网 IP | 8.162.28.217 |
| 内网 IP | 172.18.60.89 |
| 配置 | 2 vCPU / 2 GiB / 40 GiB ESSD |
| 系统 | Alibaba Cloud Linux 3 |
| 到期时间 | 2027-02-11 |

---

## 一、首次部署（从零开始）

### 1. SSH 登录服务器

```bash
ssh root@8.162.28.217
```

### 2. 安装 Docker 和 Git

```bash
# Alibaba Cloud Linux / CentOS
yum install -y docker docker-compose-plugin git

# 启动 Docker 并设置开机自启
systemctl enable docker && systemctl start docker

# 验证安装
docker --version
docker compose version
```

### 3. 配置 Docker 镜像加速（国内必须）

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://dockerproxy.cn",
    "https://docker.m.daocloud.io"
  ]
}
EOF

# 重启 Docker 生效
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 4. 拉取代码

```bash
# 创建目录并克隆代码
mkdir -p /opt/fund-compare && cd /opt/fund-compare
git clone https://github.com/moonornoom/TT_G_W.git .
```

### 5. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GLM_API_KEY=your_glm_api_key
EOF

# 编辑填入实际值
nano .env
# 保存: Ctrl+O, 退出: Ctrl+X
```

### 6. 构建并启动

```bash
# 构建镜像并启动（首次构建约 3 分钟）
sudo docker compose up -d --build

# 查看构建日志
sudo docker compose logs -f

# Ctrl+C 退出日志查看
```

### 7. 验证服务

```bash
# 查看容器状态
sudo docker compose ps

# 本地测试
curl http://localhost:3000
```

---

## 二、配置安全组（阿里云控制台）

**必须配置才能外网访问**

1. 登录 [阿里云控制台](https://ecs.console.aliyun.com/)
2. 进入实例详情 → 左侧菜单「安全组」
3. 点击安全组 ID → 「入方向」→ 「手动添加」
4. 添加规则：
   - 授权策略：允许
   - 优先级：1
   - 协议类型：自定义 TCP
   - 端口范围：3000/3000（或 80/80）
   - 授权对象：0.0.0.0/0
5. 点击「保存」

**访问地址：** http://8.162.28.217:3000

---

## 三、修改端口

### 改为 80 端口（无需端口号访问）

```bash
cd /opt/fund-compare
nano docker-compose.yml
```

修改 `ports` 部分：
```yaml
ports:
  - "80:3000"  # 原来是 "3000:3000"
```

重启服务：
```bash
sudo docker compose down
sudo docker compose up -d
```

访问地址变为：http://8.162.28.217

### 其他端口示例

| 外部端口 | docker-compose.yml 配置 | 访问地址 |
|---------|------------------------|---------|
| 80 | `"80:3000"` | http://8.162.28.217 |
| 8080 | `"8080:3000"` | http://8.162.28.217:8080 |
| 3000 | `"3000:3000"` | http://8.162.28.217:3000 |

---

## 四、常用运维命令

```bash
# 进入项目目录
cd /opt/fund-compare

# 查看运行状态
sudo docker compose ps

# 查看日志（实时）
sudo docker compose logs -f

# 查看最近 100 行日志
sudo docker compose logs --tail 100

# 重启服务
sudo docker compose restart

# 停止服务
sudo docker compose down

# 重新构建并启动（代码更新后）
git pull
sudo docker compose up -d --build

# 完全重建（清理缓存）
sudo docker compose build --no-cache
sudo docker compose up -d

# 进入容器调试
sudo docker compose exec fund-compare sh

# 查看容器资源占用
sudo docker stats fund-compare
```

---

## 五、代码更新流程

```bash
cd /opt/fund-compare

# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
sudo docker compose up -d --build

# 3. 查看日志确认
sudo docker compose logs -f
```

---

## 六、故障排查

### 问题 1: Docker Hub 超时

**症状：**
```
failed to do request: Head "https://registry-1.docker.io/...": i/o timeout
```

**解决：** 配置镜像加速（见上方第三节）

---

### 问题 2: 容器无法启动

```bash
# 查看详细日志
sudo docker compose logs

# 检查环境变量是否正确
cat .env

# 检查端口是否被占用
netstat -tlnp | grep 3000
```

---

### 问题 3: 外网无法访问

**检查清单：**
1. 容器是否运行：`sudo docker compose ps`
2. 安全组是否开放端口
3. 防火墙是否放行：`firewall-cmd --list-ports`

---

### 问题 4: 构建缓存问题

```bash
# 清理所有构建缓存重新构建
sudo docker compose build --no-cache
sudo docker compose up -d
```

---

## 七、Nginx 反向代理（可选）

如需绑定域名和 HTTPS，可使用 Nginx：

```bash
# 安装 Nginx
yum install -y nginx

# 启动 Nginx
systemctl enable nginx && systemctl start nginx
```

配置文件 `/etc/nginx/conf.d/fund-compare.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 测试配置
nginx -t

# 重载配置
systemctl reload nginx
```

---

## 八、备份与恢复

### 备份

```bash
# 备份整个项目（含 .env）
tar -czvf fund-compare-backup-$(date +%Y%m%d).tar.gz /opt/fund-compare
```

### 恢复

```bash
# 解压到 /opt
tar -xzvf fund-compare-backup-20260403.tar.gz -C /

# 重新启动
cd /opt/fund-compare
sudo docker compose up -d
```

---

## 九、监控与告警（可选）

### 查看容器健康状态

```bash
sudo docker inspect --format='{{json .State.Health}}' fund-compare | jq
```

### 设置资源限制

编辑 `docker-compose.yml`：

```yaml
services:
  fund-compare:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 快速参考卡片

```bash
# 一键部署（首次）
yum install -y docker docker-compose-plugin git && \
systemctl enable docker && systemctl start docker && \
mkdir -p /etc/docker && \
echo '{"registry-mirrors":["https://mirror.ccs.tencentyun.com","https://dockerproxy.cn"]}' > /etc/docker/daemon.json && \
systemctl restart docker && \
mkdir -p /opt/fund-compare && cd /opt/fund-compare && \
git clone https://github.com/moonornoom/TT_G_W.git . && \
cp .env.example .env && \
nano .env && \
docker compose up -d --build

# 日常更新
cd /opt/fund-compare && git pull && docker compose up -d --build

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart
```
