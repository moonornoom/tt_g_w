# 功能模块文档

基于截图分析和代码库梳理的功能模块划分与业务逻辑。

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         应用入口 (app/)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   首页模块   │  │   对比模块   │  │      API 层          │  │
│  │  /           │  │  /compare    │  │  /api/funds/*        │  │
│  │  (page.tsx)  │  │(compare/     │  │  - list              │  │
│  │              │  │ page.tsx)    │  │  - quote             │  │
│  │              │  │              │  │  - history           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      数据服务层 (lib/)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  eastmoney-client.ts  │  eastmoney.ts  │  supabase.ts    │   │
│  │  (客户端 API 封装)     │  (服务端 API)  │  (数据库)        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 首页模块 (Home Page)

### 2.1 功能概述

首页是应用的核心入口，提供基金列表浏览、搜索、筛选、观察组管理和对比入口。

### 2.2 子模块划分

```
┌─────────────────────────────────────────────────────────────────┐
│                         Header                                   │
│  ┌─────────┐                    ┌─────────────────────────────┐ │
│  │  Logo   │                    │  已选基金 + 对比按钮        │ │
│  └─────────┘                    │  新建观察组按钮             │ │
│                                 └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌──────────────────────────────────────────────┐ │
│ │            │ │  搜索栏                                       │ │
│ │  观察组    │ ├──────────────────────────────────────────────┤ │
│ │  面板      │ │  统计卡片 (总数/上涨/下跌/平均收益)           │ │
│ │            │ ├──────────────────────────────────────────────┤ │
│ │  (可选)    │ │  类型筛选 Tabs                                │ │
│ │            │ ├──────────────────────────────────────────────┤ │
│ │            │ │  基金卡片网格                                 │ │
│ │            │ │                                              │ │
│ └────────────┘ └──────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         Footer                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 核心状态

```typescript
// 基金数据
const [funds, setFunds] = useState<FundSearchResult[]>([])
const [loading, setLoading] = useState(false)
const [searchQuery, setSearchQuery] = useState('')

// 选择状态
const [selectedFunds, setSelectedFunds] = useState<FundSearchResult[]>([])
const [activeType, setActiveType] = useState<string>('全部')

// 观察组
const [watchGroups, setWatchGroups] = useState<WatchGroup[]>([])
const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
```

### 2.4 功能流程

#### 2.4.1 基金搜索流程
```
用户输入 → handleSearch(query)
    ↓
query.trim() ?
    ├─ Yes → searchFundsAPI(query) → setFunds(results)
    └─ No  → loadFunds() (加载默认列表)
```

#### 2.4.2 基金选择流程
```
用户点击选择 → toggleFundSelection(fund)
    ↓
已选中?
    ├─ Yes → 从 selectedFunds 移除
    └─ No  → selectedFunds.length < 5 ?
              ├─ Yes → 添加到 selectedFunds
              └─ No  → 忽略 (最多选5只)
```

#### 2.4.3 观察组管理流程
```
创建组: createGroup() → saveGroups([...watchGroups, newGroup])
删除组: deleteGroup(id) → saveGroups(watchGroups.filter(...))
添加基金: addFundToGroup(groupId) → 检查重复 → saveGroups(updated)
移除基金: removeFundFromGroup(groupId, fundCode)
```

### 2.5 数据类型

```typescript
// 基金搜索结果
interface FundSearchResult {
  code: string           // 基金代码
  name: string           // 基金名称
  type: string           // 基金类型
  company: string        // 基金公司
  net_value: number      // 单位净值
  total_assets: number   // 总资产
  day_growth: number     // 日涨跌幅
  week_growth: number    // 周涨跌幅
  month_growth: number   // 月涨跌幅
  year_growth: number    // 年涨跌幅
  management_fee: number // 管理费
  custodian_fee: number  // 托管费
  establishment_date: string
  status: string
}

// 观察组
interface WatchGroup {
  id: string
  name: string
  funds: FundSearchResult[]
  createdAt: number
}
```

---

## 3. 对比模块 (Compare Page)

### 3.1 功能概述

对比页面展示选中基金的历史走势对比、详细指标对比表格。

### 3.2 子模块划分

```
┌─────────────────────────────────────────────────────────────────┐
│                         Header                                   │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────────────┐ │
│  │ 返回    │  │   Logo   │  │      时间范围选择器             │ │
│  └─────────┘  └──────────┘  └────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  累计收益走势图                            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │                    Recharts LineChart               │  │ │
│  │  │  - 多基金曲线叠加                                    │  │ │
│  │  │  - 鼠标悬停 Tooltip                                  │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │  图例: 基金A (红) | 基金B (蓝) | ...                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  详细对比卡片                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │ │
│  │  │ 基金A    │ │ 基金B    │ │ 基金C    │ │ 基金D    │     │ │
│  │  │ 净值     │ │ 净值     │ │ 净值     │ │ 净值     │     │ │
│  │  │ 累计收益 │ │ 累计收益 │ │ 累计收益 │ │ 累计收益 │     │ │
│  │  │ 日涨跌   │ │ 日涨跌   │ │ 日涨跌   │ │ 日涨跌   │     │ │
│  │  │ 波动率   │ │ 波动率   │ │ 波动率   │ │ 波动率   │     │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  指标对比表                                │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  指标    │ 基金A │ 基金B │ 基金C │ 基金D │ ...     │  │ │
│  │  ├─────────────────────────────────────────────────────┤  │ │
│  │  │  单位净值│       │       │       │       │         │  │ │
│  │  │  累计收益│       │       │       │       │         │  │ │
│  │  │  日涨跌幅│       │       │       │       │         │  │ │
│  │  │  基金类型│       │       │       │       │         │  │ │
│  │  │  基金公司│       │       │       │       │         │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 核心状态

```typescript
const [funds, setFunds] = useState<FundInfo[]>([])
const [loading, setLoading] = useState(true)
const [days, setDays] = useState(30) // 时间范围
const [allFunds, setAllFunds] = useState<FundSearchResult[]>([])

// 从 URL 获取基金代码
const fundCodes = searchParams.get('funds')?.split(',').filter(Boolean) || []
```

### 3.4 数据类型

```typescript
interface FundInfo {
  code: string
  name: string
  type: string
  company: string
  history: FundHistoryItem[]
}

interface FundHistoryItem {
  date: string           // YYYYMMDD
  netValue: number       // 单位净值
  dayGrowth: number      // 日涨跌幅
  cumulativeGrowth: number // 累计收益率
}
```

### 3.5 计算逻辑

#### 累计收益率计算
```typescript
// 从最早到最新计算累计收益
let baseValue = rows[0]?.netValue || 1
for (const row of rows) {
  cumulativeGrowth = ((row.netValue - baseValue) / baseValue) * 100
}
```

#### 波动率计算
```typescript
volatility: ((maxNav - minNav) / firstNetValue * 100).toFixed(2)
```

---

## 4. API 模块

### 4.1 API 路由

| 路由 | 方法 | 用途 |
|-----|------|-----|
| `/api/funds/list` | GET | 获取基金列表 |
| `/api/funds/quote?codes=xxx` | GET | 批量获取实时估值 |
| `/api/funds/history?code=xxx&pageSize=30` | GET | 获取历史净值 |

### 4.2 外部数据源

| 数据 | 来源 | API |
|-----|------|-----|
| 基金列表 | 天天基金 | `http://fund.eastmoney.com/js/fundcode_search.js` |
| 实时估值 | 天天基金 | `http://fundgz.1234567.com.cn/js/{code}.js` |
| 历史净值 | 天天基金 | `http://fund.eastmoney.com/f10/F10Data.aspx` |
| 基金详情 | 天天基金 | `http://fund.eastmoney.com/pingzhongdata/{code}.js` |

### 4.3 客户端 API 封装

```typescript
// lib/eastmoney-client.ts

// 获取基金列表
export async function getFundListAPI(limit: number): Promise<FundSearchResult[]>

// 搜索基金
export async function searchFundsAPI(keyword: string, limit: number): Promise<FundSearchResult[]>

// 批量获取实时估值
export async function getFundQuotesAPI(codes: string[]): Promise<Record<string, FundQuote>>

// 获取历史净值
export async function getFundHistoryAPI(fundCode: string, pageSize: number): Promise<FundHistoryItem[]>
```

---

## 5. 观察组模块

### 5.1 功能概述

用户可创建多个观察组，将关注的基金添加到组中进行分类管理。

### 5.2 数据存储

使用 `localStorage` 持久化：

```typescript
const STORAGE_KEY = 'fund_watch_groups'

// 保存
localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))

// 加载
const saved = localStorage.getItem(STORAGE_KEY)
setWatchGroups(JSON.parse(saved))
```

### 5.3 操作流程

```
┌─────────────────────────────────────────────────┐
│                观察组操作流程                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  新建组                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│  │ 点击    │ → │ 输入    │ → │ 创建    │    │
│  │ 新建    │    │ 组名    │    │ 保存    │    │
│  └─────────┘    └─────────┘    └─────────┘    │
│                                                 │
│  添加基金                                       │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│  │ 基金卡  │ → │ 选择    │ → │ 添加    │    │
│  │ 片悬停  │    │ 目标组  │    │ 完成    │    │
│  └─────────┘    └─────────┘    └─────────┘    │
│                                                 │
│  管理 (展开/删除)                               │
│  ┌─────────┐    ┌─────────┐                    │
│  │ 点击组  │ ↔ │ 展开收起│                    │
│  └─────────┘    └─────────┘                    │
│  ┌─────────┐    ┌─────────┐                    │
│  │ 删除    │ → │ 确认    │                    │
│  │ 按钮    │    │ 删除    │                    │
│  └─────────┘    └─────────┘                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 6. 截图功能对比

根据截图分析，当前实现与截图的差异：

### 6.1 已实现功能 ✅

| 功能 | 状态 | 位置 |
|-----|------|-----|
| 基金列表展示 | ✅ | 首页 |
| 涨跌幅显示 | ✅ | 基金卡片 |
| 基金类型筛选 | ✅ | Tab 筛选 |
| 基金对比 | ✅ | /compare |
| 历史走势图 | ✅ | 对比页 |
| 时间范围切换 | ✅ | 对比页 |
| 观察组管理 | ✅ | 首页侧边栏 |
| 基金搜索 | ✅ | 搜索栏 |

### 6.2 待扩展功能 📋

| 功能 | 截图描述 | 建议实现 |
|-----|---------|---------|
| A股指数列表 | 上证、沪深300等 | 新增 Stock 模块 |
| 港股列表 | 美团、腾讯等 | 新增 HKStock 模块 |
| 美股指数 | 纳斯达克、道琼斯等 | 新增 USStock 模块 |
| 期货列表 | CN Future | 新增 Future 模块 |
| 分类 Tab 导航 | 底部分类切换 | 首页底部 Tab 栏 |
| 单基金详情页 | 净值走势、累计收益 | 新增 /fund/[code] 页面 |
| 基准对比线 | 图表中的绿色基准线 | 对比图表增强 |

### 6.3 建议架构扩展

```
app/
├── page.tsx          # 首页 (基金)
├── fund/
│   └── [code]/
│       └── page.tsx  # 基金详情页
├── stock/
│   └── page.tsx      # A股列表
├── hk-stock/
│   └── page.tsx      # 港股列表
├── us-stock/
│   └── page.tsx      # 美股列表
├── compare/
│   └── page.tsx      # 对比页
└── api/
    ├── funds/
    ├── stocks/
    └── quotes/
```

---

## 7. 状态管理

### 7.1 当前方案

使用 React `useState` + `useEffect` 进行本地状态管理。

### 7.2 状态持久化

| 数据 | 存储方式 | Key |
|-----|---------|-----|
| 观察组 | localStorage | `fund_watch_groups` |
| 基金数据 | API 实时获取 | - |
| 选择状态 | 内存 (useState) | - |

### 7.3 建议优化

1. **使用 Zustand** 管理全局状态
2. **使用 React Query** 管理 API 缓存
3. **使用 IndexedDB** 存储大量本地数据

---

## 8. 业务规则

### 8.1 基金选择限制

```typescript
// 最多选择5只基金进行对比
if (selectedFunds.length >= 5 && !isSelected) {
  return // 忽略
}
```

### 8.2 涨跌显示规则

```typescript
// 中国股市：红涨绿跌
const getGrowthColor = (value: number) => 
  value >= 0 ? 'text-red-500' : 'text-green-500'

// 格式化显示
const formatGrowth = (value: number) => 
  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
```

### 8.3 时间范围选项

```typescript
const TIME_RANGES = [
  { label: '近7天', value: 7 },
  { label: '近1月', value: 30 },
  { label: '近3月', value: 90 },
  { label: '近6月', value: 180 },
  { label: '近1年', value: 365 },
]
```

---

## 9. 错误处理

### 9.1 API 错误

```typescript
try {
  const data = await getFundListAPI()
  setFunds(data)
} catch (error) {
  console.error('加载基金数据失败:', error)
  // 可添加 toast 提示
} finally {
  setLoading(false)
}
```

### 9.2 空状态处理

```typescript
if (fundCodes.length === 0) {
  return <EmptyState message="未选择基金" />
}

if (loading) {
  return <LoadingSpinner />
}
```

---

## 10. 性能优化建议

1. **虚拟列表**: 基金列表使用 `react-window` 处理大数据量
2. **图片懒加载**: 基金公司 logo 懒加载
3. **请求防抖**: 搜索输入使用 `debounce`
4. **缓存策略**: 基金列表使用 React Query 缓存
5. **代码分割**: 对比页使用 `dynamic import`
