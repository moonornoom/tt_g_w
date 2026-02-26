# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
pnpm install       # 安装依赖
pnpm dev           # 启动开发服务器 (http://localhost:3000)
pnpm build         # 构建生产版本
pnpm start         # 运行生产服务器
pnpm lint          # ESLint 检查
```

## 环境变量

复制 `.env.example` 为 `.env`，填入以下 key：

| 变量 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 key |
| `GLM_API_KEY` | 智谱 GLM AI 分析（可选） |

> 注意：`TUSHARE_TOKEN` 已不再使用，数据源已改为天天基金 + 新浪财经的免费接口。

## 架构概览

这是一个中国公募基金观察和对比工具，基于 **Next.js 16 App Router + TypeScript + Tailwind CSS v4**，使用 pnpm 管理依赖。

### 页面路由

| 路由 | 功能 |
|------|------|
| `/` | 首页：观察组管理、基金搜索、卡片/列表展示 |
| `/compare?funds=xxx,yyy` | 基金对比：净值走势图（Recharts）+ 指标对比表 |
| `/analyze` | AI 分析：调用 GLM API 分析观察组基金组合 |

### API Routes

| 路由 | 说明 |
|------|------|
| `GET /api/funds/list` | 代理天天基金 fundcode_search.js，返回全量基金列表 |
| `GET /api/funds/quote?codes=xxx&source=eastmoney\|sina` | 批量获取实时估值，支持两种数据源 |
| `GET /api/funds/history?code=xxx&pageSize=30` | 通过 HTML 正则解析天天基金历史净值页 |
| `POST /api/analyze` | 调用 GLM API 做 AI 分析，API Key 从请求头 `X-GLM-API-Key` 传入 |

### 数据流

```
前端组件
  ↓ 调用
lib/eastmoney-client.ts  (客户端 API 封装，通过 fetch 调用下方路由)
  ↓ 代理
app/api/funds/*          (Next.js API Routes，服务端代理外部接口，解决跨域)
  ↓ 请求
天天基金 / 新浪财经      (外部数据源，均为免费接口)
```

两种实时数据源（用户可在设置中切换）：
- **eastmoney（默认）**：`fundgz.1234567.com.cn/js/{code}.js`，仅交易时间更新
- **sina**：`hq.sinajs.cn/list=fu_xxx`，`lib/sina-client.ts` 处理 GBK 编码，非交易时间也有数据

### 状态持久化

全部使用 `localStorage`，无后端存储：

| Key | 内容 |
|-----|------|
| `fund_watch_groups` | 观察组列表（含基金数据），JSON 序列化 |
| `fund_data_source` | 当前数据源 `eastmoney` \| `sina` |
| `glm_api_key` | 智谱 GLM API Key |

### 组件库

所有 UI 组件在 `components/ui/`，通过 `components/ui/index.ts` 统一导出：
`Card`, `Button`, `IconButton`, `Badge`, `FundTypeBadge`, `GrowthText`, `GrowthBadge`, `Loading`, `LoadingArea`, `Input`, `SearchInput`, `Modal`, `ModalFooter`, `ConfirmModal`

## UI 设计规范要点

遵循 `docs/UI-RULES.md`，关键规则：

- **深色主题**：主背景 `#0a0a0f`，卡片 `#16161f`，边框 `#2a2a3a`
- **红涨绿跌**：中国股市惯例，上涨 `text-red-500`，下跌 `text-green-500`
- **主色调**：渐变 `from-red-500 to-orange-500`
- **CSS 变量**：`--bg-primary/secondary/card/hover`，`--text-primary/secondary/muted` 等（定义在 `app/globals.css`）
- **工具函数**：`GrowthText` 组件自动处理涨跌颜色和格式化；`formatAmount` 处理亿/万单位

## 重要注意事项

1. **模拟数据**：周/月/年增长率数据**是随机生成的**（`eastmoney-client.ts` 中的 `weekGrowth`/`monthGrowth`/`yearGrowth`），只有日涨跌和净值是真实 API 数据。
2. **HTML 解析脆弱**：历史净值接口 (`/api/funds/history`) 通过正则解析 HTML，若天天基金改版会失效。
3. **跨域代理**：前端不能直接请求天天基金/新浪接口（跨域），必须通过 Next.js API Routes 代理。
4. **`lib/supabase.ts`** 已配置但目前功能未深度集成，基本不影响主流程。
5. **数据限流**：`/api/funds/quote` 单次最多处理 50 个基金代码；`sina-client.ts` 每批 20 个并发请求。
