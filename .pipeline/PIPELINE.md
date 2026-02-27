# 项目流水线规则

## 技术栈约束
- Node.js + TypeScript 5，严格模式
- Next.js 16 App Router，不使用 Pages Router
- Tailwind CSS v4（使用 CSS 变量，不使用旧版 tailwind.config.js 主题扩展）
- 包管理器：**pnpm**，禁止引入 npm/yarn
- 禁止引入 moment.js（使用 date-fns）
- 禁止引入 lodash（使用原生 JS）
- 新增 UI 组件优先复用 `components/ui/`，不重复造轮子

## 代码规范
- 文件命名：页面用 `page.tsx`，组件用 PascalCase，工具用 camelCase
- 组件放 `components/`，API 路由放 `app/api/`，工具函数放 `lib/`
- 类型定义放 `types/`
- 使用 CSS 变量（`--bg-primary` 等）而非硬编码颜色值
- UI 遵循 `docs/UI-RULES.md` 深色主题规范
- 异步数据获取统一走 `lib/eastmoney-client.ts`，不在组件内直接 fetch 外部接口

## 验证命令
```bash
pnpm lint          # ESLint 检查，每步实施后必须通过
pnpm build         # 构建验证，重要改动后执行
```

## 不可触碰
- `app/globals.css` 中的 CSS 变量定义（除非明确要求修改主题）
- `components/ui/index.ts` 导出列表（新增组件要同步更新）
- `.env` 文件（不得提交敏感信息）

## 受保护分支
- `main`（主分支，禁止直接 force push）
