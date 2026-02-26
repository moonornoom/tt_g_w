# UI 设计规范

基于截图分析和现有代码库整理的UI规则。

---

## 1. 设计系统

### 1.1 色彩系统

#### 背景色层级
| 变量 | 色值 | 用途 |
|-----|------|-----|
| `--bg-primary` | `#0a0a0f` | 页面主背景 |
| `--bg-secondary` | `#12121a` | Header/Footer 背景 |
| `--bg-tertiary` | `#1a1a25` | Hover 状态背景 |
| `--bg-card` | `#16161f` | 卡片/面板背景 |
| `--bg-hover` | `#1e1e2a` | 交互元素悬停 |

#### 边框色
| 变量 | 色值 | 用途 |
|-----|------|-----|
| `--border-primary` | `#2a2a3a` | 默认边框 |
| `#3a3a4a` | Hover 边框 |

#### 文字色
| 变量 | 色值 | 用途 |
|-----|------|-----|
| `--text-primary` | `#e8e8f0` | 主要文字 |
| `--text-secondary` | `#a0a0b0` | 次要文字 |
| `--text-muted` | `#606070` | 辅助/禁用文字 |

#### 涨跌色（中国股市惯例）
| 状态 | 色值 | Tailwind |
|-----|------|----------|
| 上涨 | `#ef4444` (红) | `text-red-500` / `bg-red-500/10` |
| 下跌 | `#22c55e` (绿) | `text-green-500` / `bg-green-500/10` |
| 平盘 | `#a0a0b0` (灰) | `text-gray-400` |

#### 基金类型色
| 类型 | 色值 | Tailwind |
|-----|------|----------|
| 股票型 | `#ef4444` | `text-red-400 bg-red-500/10` |
| 混合型 | `#f59e0b` | `text-amber-400 bg-amber-500/10` |
| 债券型 | `#10b981` | `text-emerald-400 bg-emerald-500/10` |
| 指数型 | `#3b82f6` | `text-blue-400 bg-blue-500/10` |
| QDII | `#8b5cf6` | `text-purple-400 bg-purple-500/10` |
| 货币型 | `#06b6d4` | `text-cyan-400 bg-cyan-500/10` |

#### 强调色
| 用途 | 色值 | Tailwind |
|-----|------|----------|
| 主按钮/品牌 | `#ef4444 → #f97316` | `from-red-500 to-orange-500` |
| 链接/选中 | `#ef4444` | `text-red-400` |

### 1.2 间距系统

遵循 4px 基础单位：

| 名称 | 值 | 用途 |
|-----|---|-----|
| xs | 4px | 图标与文字间距 |
| sm | 8px | 紧凑元素间距 |
| md | 12px | 常规元素间距 |
| lg | 16px | 模块内间距 |
| xl | 24px | 区块间距 |
| 2xl | 32px | 大区块间距 |

### 1.3 圆角系统

| 名称 | 值 | 用途 |
|-----|---|-----|
| sm | 4px | 小按钮、标签 |
| md | 8px | 输入框、小组件 |
| lg | 12px | 卡片、面板 |
| xl | 16px | 大卡片、模态框 |
| full | 9999px | 圆形图标、徽章 |

### 1.4 字体系统

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
  'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
```

| 名称 | 大小 | 字重 | 用途 |
|-----|-----|-----|-----|
| xs | 12px | 400 | 辅助信息、时间戳 |
| sm | 14px | 400-500 | 次要内容、按钮 |
| base | 16px | 400 | 正文内容 |
| lg | 18px | 500-600 | 卡片标题 |
| xl | 20px | 600 | 区块标题 |
| 2xl | 24px | 700 | 页面标题 |
| 3xl | 30px | 700 | 数据展示 |

---

## 2. 布局规范

### 2.1 页面结构

```
┌─────────────────────────────────────────────────┐
│                    Header (64px)                │  sticky top-0
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌────────────────────────────────┐ │
│ │          │ │                                │ │
│ │ Sidebar  │ │         Main Content           │ │
│ │ (280px)  │ │                                │ │
│ │          │ │                                │ │
│ │ 可选     │ │                                │ │
│ └──────────┘ └────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│                    Footer                       │
└─────────────────────────────────────────────────┘
```

### 2.2 最大宽度

```css
max-width: 1600px;
margin: 0 auto;
padding: 0 24px;
```

### 2.3 响应式断点

| 断点 | 宽度 | 列数 |
|-----|------|-----|
| mobile | < 768px | 1列 |
| tablet | 768px - 1024px | 2列 |
| desktop | 1024px - 1280px | 3列 |
| large | > 1280px | 4列 |

---

## 3. 组件规范

### 3.1 卡片 (Card)

```tsx
<div className="p-4 rounded-xl bg-[#16161f] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all">
  {/* 内容 */}
</div>
```

**状态变体**：
- 默认: `border-[#2a2a3a]`
- 选中: `border-red-500/50 bg-red-500/5`
- Hover: `border-[#3a3a4a]`

### 3.2 按钮 (Button)

#### 主按钮
```tsx
<button className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium hover:opacity-90">
  操作
</button>
```

#### 次要按钮
```tsx
<button className="px-4 py-2 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] text-gray-300 hover:bg-[#1e1e2a] hover:border-[#3a3a4a]">
  操作
</button>
```

#### 标签按钮（选中态）
```tsx
<button className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
  类型筛选
</button>
```

### 3.3 输入框 (Input)

```tsx
<input className="w-full px-4 py-3 bg-[#16161f] border border-[#2a2a3a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#3a3a4a]" />
```

### 3.4 标签/徽章 (Badge)

```tsx
<span className="px-2 py-0.5 rounded text-xs font-medium text-red-400 bg-red-500/10">
  股票型
</span>
```

### 3.5 模态框 (Modal)

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
  <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-6 w-96">
    {/* 内容 */}
  </div>
</div>
```

背景: `modal-backdrop { background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); }`

### 3.6 Header

```tsx
<header className="sticky top-0 z-50 bg-[#12121a]/95 backdrop-blur border-b border-[#2a2a3a]">
  <div className="max-w-[1600px] mx-auto px-6 py-3">
    {/* 内容 */}
  </div>
</header>
```

---

## 4. 数据展示规范

### 4.1 涨跌幅显示

```tsx
// 涨跌颜色辅助函数
const getGrowthColor = (value: number) => value >= 0 ? 'text-red-500' : 'text-green-500'
const getGrowthBg = (value: number) => value >= 0 ? 'bg-red-500/10' : 'bg-green-500/10'

// 显示格式
<span className={getGrowthColor(growth)}>
  {growth >= 0 ? '+' : ''}{growth.toFixed(2)}%
</span>
```

### 4.2 金额格式化

```tsx
export function formatAmount(amount: number): string {
  if (amount >= 100000000) {
    return (amount / 100000000).toFixed(2) + '亿'
  } else if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万'
  }
  return amount.toFixed(2)
}
```

### 4.3 日期格式化

```tsx
// YYYYMMDD → MM/DD
export function formatDate(dateStr: string): string {
  if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
    return dateStr.slice(4, 6) + '/' + dateStr.slice(6, 8)
  }
  return dateStr
}
```

---

## 5. 图表规范

### 5.1 图表容器

```tsx
<div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-6">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-lg font-bold text-white">图表标题</h2>
      <p className="text-sm text-gray-500">副标题说明</p>
    </div>
    {/* 时间选择器 */}
  </div>
  <ResponsiveContainer width="100%" height={400}>
    {/* 图表内容 */}
  </ResponsiveContainer>
</div>
```

### 5.2 时间范围选择器

```tsx
const timeRanges = ['1月', '3月', '6月', '1年', '3年', '5年', '今年来', '最大']
```

### 5.3 图表配色

| 用途 | 色值 |
|-----|------|
| 主线 | `#ef4444` (红) |
| 对比线1 | `#3b82f6` (蓝) |
| 对比线2 | `#22c55e` (绿) |
| 对比线3 | `#f59e0b` (橙) |
| 对比线4 | `#8b5cf6` (紫) |
| 网格线 | `#2a2a3a` |

---

## 6. 交互规范

### 6.1 Hover 状态

- 卡片: `hover:border-[#3a3a4a]`
- 按钮: `hover:opacity-90` (主按钮) / `hover:bg-[#1e1e2a]` (次要)
- 链接: `hover:text-white`

### 6.2 Loading 状态

```tsx
<div className="flex items-center justify-center py-20">
  <div className="w-10 h-10 border-2 border-[#2a2a3a] border-t-red-500 rounded-full animate-spin"></div>
</div>
```

### 6.3 选中状态

```tsx
// 基金选中
className={`${
  isSelected 
    ? 'border-red-500/50 bg-red-500/5' 
    : 'border-[#2a2a3a] hover:border-[#3a3a4a]'
}`}
```

### 6.4 禁用状态

```tsx
className="text-gray-700 cursor-not-allowed"
```

---

## 7. 动画规范

### 7.1 过渡动画

```css
transition-all /* 通用 */
transition-colors /* 颜色变化 */
transition-transform /* 变换 */
```

默认时长: `150ms`

### 7.2 脉冲动画

```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}
.pulse-up { animation: pulse-glow 2s infinite; }
```

---

## 8. 无障碍规范

### 8.1 对比度

- 主要文字与背景: ≥ 4.5:1
- 次要文字与背景: ≥ 3:1

### 8.2 焦点状态

```css
focus:outline-none focus:border-[#3a3a4a]
```

### 8.3 语义化标签

- 使用 `<header>`, `<main>`, `<aside>`, `<footer>`
- 按钮使用 `<button>` 而非 `<div>`
- 表格使用 `<table>` 结构

---

## 9. Tailwind 快捷类

### 常用组合

```css
/* 卡片基础 */
.card { @apply p-4 rounded-xl bg-[#16161f] border border-[#2a2a3a]; }

/* 按钮基础 */
.btn-primary { @apply px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium; }
.btn-secondary { @apply px-4 py-2 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] text-gray-300; }

/* 涨跌文字 */
.text-up { @apply text-red-500; }
.text-down { @apply text-green-500; }
```

---

## 10. 截图参考要点

根据截图分析，UI应包含：

### 左侧面板
- 基金/股票列表，带涨跌幅显示
- 绿色对勾标记已选择项
- 可折叠分组

### 右侧图表区
- 单位净值走势图
- 累计收益率走势图
- 基准对比图
- 时间范围切换器

### 底部分类导航
- A股、港股、美股、期货分类
- Tab 切换样式

### 通用元素
- 深色主题
- 红涨绿跌
- 卡片式布局
- 图表使用平滑曲线
