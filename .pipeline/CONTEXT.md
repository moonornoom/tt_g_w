# 项目上下文

## 项目简介
fund-compare 是一个中国公募基金观察和对比工具。支持基金搜索、观察组管理、实时估值刷新、多基金净值走势对比、以及 GLM AI 分析功能。数据来源为天天基金 + 新浪财经免费接口，状态全部使用 localStorage 持久化，无需后端数据库。

## 技术栈
- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS v4
- **运行时**: React 19
- **图表**: Recharts 3
- **HTTP**: Axios + fetch
- **编码处理**: iconv-lite（新浪 GBK 编码）
- **包管理**: pnpm 10
- **可选**: Supabase（已配置但未深度集成）、智谱 GLM AI

## 关键约束
- 使用 pnpm，禁止 npm/yarn
- 深色主题：主背景 `#0a0a0f`，卡片 `#16161f`，边框 `#2a2a3a`
- 红涨绿跌（中国股市惯例）：涨 `text-red-500`，跌 `text-green-500`
- 前端不能直接请求天天基金/新浪接口（跨域），必须通过 Next.js API Routes 代理
- 周/月/年增长率是模拟数据，日涨跌和净值是真实数据

## 当前进行中的任务
（无）

## 已完成的重要任务
（无）
