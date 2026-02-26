# 🏦 基金对比工具

基于 Next.js + TypeScript + Supabase + Tushare API 构建的中国公募基金数据查询和对比工具。

## ✨ 功能特性

- 🔍 **基金搜索** - 按名称、代码、公司快速搜索
- 📊 **基金列表** - 展示基金基本信息、净值、收益率等
- 📈 **多基金对比** - 选择最多5只基金进行对比
- 📉 **净值走势图** - 使用 Recharts 可视化基金净值变化
- 📋 **对比表格** - 多维度指标对比表格
- 🎨 **响应式设计** - 适配移动端和桌面端
- 🎯 **实时数据** - 从 Tushare API 获取最新数据

## 🛠️ 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS
- **数据库**: Supabase (PostgreSQL)
- **图表**: Recharts
- **API**: Tushare (中国公募基金数据)
- **HTTP**: Axios

## 📦 安装

### 1. 克隆项目

```bash
git clone <repository-url>
cd fund-compare
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API 密钥：

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Tushare API (获取免费 token)
# 注册地址: https://tushare.pro/
TUSHARE_TOKEN=your_tushare_token
```

### 4. 运行开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 📁 项目结构

```
fund-compare/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 首页 - 基金列表和搜索
│   ├── compare/
│   │   └── page.tsx       # 基金对比页面
│   ├── layout.tsx          # 根布局
│   └── globals.css         # 全局样式
├── lib/                    # 工具和配置
│   ├── supabase.ts        # Supabase 客户端配置
│   └── tushare.ts         # Tushare API 封装
├── types/                  # TypeScript 类型定义
│   └── fund.ts            # 基金相关类型
├── components/              # React 组件（可扩展）
│   └── ui/                # UI 组件
├── .env.example            # 环境变量模板
└── package.json
```

## 📊 功能说明

### 首页 (`/`)

- 显示基金统计（总数、各类型基金数量）
- 基金列表展示（卡片形式）
- 实时搜索功能
- 选择基金进行对比（最多5只）
- 显示基金基本信息：净值、规模、收益率、费率、成立日期

### 对比页面 (`/compare`)

- 净值走势图（Recharts 线图）
- 可选择时间范围（7天、30天、3个月、6个月、1年）
- 对比表格展示多个指标：
  - 单位净值
  - 近1年/6个月/1周收益率
  - 管理费率、托管费率
  - 成立日期
- 性能总结卡片：
  - 最大单日涨幅/跌幅
  - 正收益天数
  - 胜率

## 🔌 数据源

### Tushare API

项目使用 Tushare API 获取中国公募基金数据：

- **基金基本信息**: `fund/fund_basic`
- **基金净值历史**: `fund/fund_nav_hist`
- **免费额度**: 每分钟200次请求

**获取免费 Token**:
1. 访问 https://tushare.pro/
2. 注册账号
3. 获取 API Token
4. 填入 `.env` 文件

### Supabase

Supabase 用于（可选扩展功能）：

- 用户认证
- 用户收藏基金列表
- 基金对比历史保存
- 实时数据更新

**创建 Supabase 项目**:
1. 访问 https://supabase.com/
2. 创建新项目
3. 在 SQL Editor 执行建表脚本（参考 `lib/supabase.ts` 中的类型定义）

## 🚀 构建生产版本

```bash
pnpm build
pnpm start
```

## 🎨 自定义样式

项目使用 Tailwind CSS，可以轻松自定义：

修改 `app/globals.css` 中的 CSS 变量：

```css
:root {
  --primary: #10b981;           /* 主色调 */
  --primary-hover: #0891b2;
  --bg-card: #ffffff;
  --bg-page: #f8fafc;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border: #e5e7eb;
}
```

## 🔮 Tushare API 使用示例

```typescript
import { getOpenFundList, getFundNavHistory } from '@/lib/tushare'

// 获取基金列表
const funds = await getOpenFundList({ limit: 100 })

// 搜索基金
const results = await searchFunds('华夏')

// 获取净值历史
const history = await getFundNavHistory('000001', {
  startDate: '2024-01-01',
  endDate: '2024-12-31'
})
```

## 📝 待扩展功能

- [ ] 用户登录（Supabase Auth）
- [ ] 保存对比结果
- [ ] 基金详情页（更多信息展示）
- [ ] 基金收藏功能
- [ ] 收益率排行榜
- [ ] 风险指标对比（夏普比率、最大回撤等）
- [ ] 持仓跟踪

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 本项目仅供学习参考，投资有风险，入市需谨慎。
