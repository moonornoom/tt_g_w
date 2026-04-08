# Stage 1: Dependencies
FROM node:20-alpine AS deps

# 使用阿里云 Alpine 镜像源 + 安装依赖一步完成，减少层
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk add --no-cache libc6-compat \
    && corepack enable \
    && corepack prepare pnpm@10.12.4 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

# 淘宝镜像 + 安装依赖
RUN pnpm config set registry https://registry.npmmirror.com \
    && pnpm install --frozen-lockfile

# Stage 2: Builder（复用 deps 的基础镜像和 pnpm，不重新安装）
FROM deps AS builder

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY . .

RUN pnpm build

# Stage 3: Runner（最小化镜像）
FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p public .next \
    && chown nextjs:nodejs .next

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
