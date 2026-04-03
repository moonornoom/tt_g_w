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

// 观察组
export interface WatchGroup {
  id: string
  name: string
  funds: FundSearchResult[]
  createdAt: number
}
