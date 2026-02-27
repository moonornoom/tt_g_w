# Docker 部署指南

## 快速开始

### 1. 配置环境变量

复制 `.env.example` 为 `.env` 并填入实际值：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GLM_API_KEY=your_glm_api_key
```

### 2. 构建并启动

```bash
# 构建镜像并后台启动
docker compose up -d --build

# 查看日志
docker compose logs -f
```

### 3. 访问应用

打开浏览器访问: http://localhost:3000

---

## 常用命令

```bash
# 停止服务
docker compose down

# 重启服务
docker compose restart

# 重新构建并启动
docker compose up -d --build

# 查看运行状态
docker compose ps

# 进入容器调试
docker compose exec fund-compare sh
```

---

## 生产环境部署

### 选项 1: Docker Compose（推荐单机部署）

1. **上传代码到服务器**

```bash
rsync -avz --exclude 'node_modules' --exclude '.next' ./ user@server:/opt/fund-compare/
```

2. **在服务器上配置环境变量**

```bash
cd /opt/fund-compare
cp .env.example .env
nano .env  # 填入生产环境变量
```

3. **启动服务**

```bash
docker compose up -d --build
```

### 选项 2: 使用预构建镜像

1. **本地构建镜像**

```bash
docker build -t fund-compare:latest .
```

2. **推送到镜像仓库**

```bash
docker tag fund-compare:latest your-registry.com/fund-compare:latest
docker push your-registry.com/fund-compare:latest
```

3. **在服务器拉取并运行**

```bash
docker pull your-registry.com/fund-compare:latest
docker run -d \
  --name fund-compare \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=xxx \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx \
  -e GLM_API_KEY=xxx \
  your-registry.com/fund-compare:latest
```

---

## 反向代理配置（Nginx 示例）

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

---

## 健康检查

容器内置健康检查，可通过以下命令查看状态：

```bash
docker inspect --format='{{json .State.Health}}' fund-compare | jq
```

---

## 资源限制（可选）

在 `docker-compose.yml` 中添加资源限制：

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

## 故障排查

### 查看容器日志

```bash
docker compose logs -f fund-compare
```

### 进入容器检查

```bash
docker compose exec fund-compare sh
```

### 常见问题

1. **端口被占用**: 修改 `docker-compose.yml` 中的端口映射
2. **构建失败**: 检查网络连接和 pnpm 版本
3. **环境变量未生效**: 确保 `.env` 文件在 `docker-compose.yml` 同级目录
