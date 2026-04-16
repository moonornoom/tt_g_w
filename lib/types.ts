/**
 * 基金相关类型定义
 */

// 数据源类型
export type DataSource = 'eastmoney' | 'sina'

// 基金搜索结果（实时数据）
export interface FundSearchResult {
  code: string
  name: string
  type: string
  company: string
  netValue: number        // 单位净值
  dayGrowth: number       // 日涨跌幅（真实数据）
}

// 基金实时估值
export interface FundQuote {
  fundcode: string
  name: string
  jzrq: string           // 净值日期
  dwjz: string           // 单位净值
  gsz: string            // 估算值
  gszzl: string          // 估算涨跌幅
  gztime: string         // 估值时间
}

// 历史净值
export interface FundHistoryItem {
  date: string
  netValue: number
  dayGrowth: number
  cumulativeGrowth: number
}

// 基金搜索筛选条件
export interface FundSearchFilters {
  company?: string
  type?: string
  minAssets?: number
  maxAssets?: number
  sortBy?: 'dayGrowth' | 'weekGrowth' | 'monthGrowth' | 'yearGrowth' | 'assets'
  order?: 'asc' | 'desc'
}

export interface WatchGroup {
  id: string
  name: string
  funds: FundSearchResult[]
  createdAt: number
}

// 基金排行榜排序字段
export type RankingSortColumn = 'SYL_Z' | 'SYL_Y' | 'SYL_3Y' | 'SYL_6Y' | 'SYL_1N' | 'SYL_JN' | 'SYL_LN'

// 基金排行榜条目
export interface FundRankingItem {
  code: string
  name: string
  fundType: string
  date: string
  dailyGrowth: number       // 日涨跌幅
  netValue: number           // 单位净值
  totalNetValue: number      // 累计净值
  weekReturn: number         // 近一周
  monthReturn: number        // 近一月
  threeMonthReturn: number   // 近三月
  sixMonthReturn: number     // 近六月
  yearReturn: number         // 近一年
  twoYearReturn: number      // 近两年
  threeYearReturn: number    // 近三年
  ytdReturn: number          // 今年以来
  sinceInception: number     // 成立以来
}
