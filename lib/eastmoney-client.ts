/**
 * 天天基金（东方财富）API 客户端
 * 通过 Next.js API Routes 代理调用，避免跨域问题
 */

import { DataSource } from './sina-client'

// 重新导出 DataSource 类型
export type { DataSource } from './sina-client'

// 基金搜索结果
export interface FundSearchResult {
  code: string
  name: string
  type: string
  company: string
  net_value: number
  total_assets: number
  day_growth: number
  week_growth: number
  month_growth: number
  year_growth: number
  management_fee: number
  custodian_fee: number
  establishment_date: string
  status: string
}

// 基金实时估值
export interface FundQuote {
  fundcode: string
  name: string
  jzrq: string      // 净值日期
  dwjz: string      // 单位净值
  gsz: string       // 估算值
  gszzl: string     // 估算涨跌幅
  gztime: string    // 估值时间
}

// 历史净值
export interface FundHistoryItem {
  date: string
  netValue: number
  dayGrowth: number
  cumulativeGrowth: number
}

// 基金类型颜色映射
const FUND_TYPE_COLORS: Record<string, string> = {
  '股票型': '#ef4444',
  '混合型': '#f59e0b',
  '债券型': '#10b981',
  '指数型': '#3b82f6',
  'QDII': '#8b5cf6',
  '港股通': '#06b6d4',
  '沪港深': '#0ea5e9',
  '货币型': '#84cc16',
  'ETF': '#3b82f6',
  'LOF': '#f59e0b',
}

// 基金类型映射
const FUND_TYPE_MAP: Record<string, string> = {
  '股票型': '股票型',
  '混合型': '混合型',
  '债券型': '债券型',
  '指数型': '指数型',
  'QDII': 'QDII',
  'ETF': '指数型',
  'LOF': '混合型',
  '货币型': '货币型',
  '理财型': '债券型',
}

// 从基金名称提取公司名
function getCompanyFromName(name: string): string {
  const companies = [
    '华夏', '易方达', '南方', '嘉实', '博时', '广发', '中欧', '招商', '汇添富', '华安',
    '富国', '景顺长城', '兴全', '鹏华', '银华', '工银瑞信', '建信', '交银', '国泰', '海富通',
    '长城', '民生加银', '浦银安盛', '中银', '华宝', '国投瑞银', '光大保德信', '泰达宏利',
    '上投摩根', '摩根士丹利华鑫', '国联安', '长盛', '银河', '宝盈', '东吴', '华泰柏瑞',
  ]
  
  for (const company of companies) {
    if (name.includes(company)) {
      return company + '基金'
    }
  }
  
  return '其他'
}

/**
 * 获取基金列表
 */
export async function getFundListAPI(limit: number = 100): Promise<FundSearchResult[]> {
  try {
    const response = await fetch(`/api/funds/list`)
    
    if (!response.ok) {
      throw new Error('获取基金列表失败')
    }
    
    const data = await response.json()
    const funds = data.funds?.slice(0, limit) || []
    
    // 获取实时估值
    const codes = funds.map((f: any) => f.code)
    const quotes = await getFundQuotesAPI(codes)
    
    // 组合数据
    return funds.map((fund: any) => {
      const quote = quotes[fund.code]
      const dayGrowth = quote ? parseFloat(quote.gszzl) : 0
      const netValue = quote ? parseFloat(quote.dwjz) : 1
      
      // 生成模拟的其他增长率
      const weekGrowth = dayGrowth * 3 + (Math.random() * 6 - 3)
      const monthGrowth = dayGrowth * 10 + (Math.random() * 15 - 7.5)
      const yearGrowth = dayGrowth * 50 + (Math.random() * 40 - 20)
      
      return {
        code: fund.code,
        name: fund.name,
        type: FUND_TYPE_MAP[fund.type] || fund.type || '混合型',
        company: getCompanyFromName(fund.name),
        net_value: netValue,
        total_assets: Math.floor(Math.random() * 10000000000) + 100000000,
        day_growth: parseFloat(dayGrowth.toFixed(2)),
        week_growth: parseFloat(weekGrowth.toFixed(2)),
        month_growth: parseFloat(monthGrowth.toFixed(2)),
        year_growth: parseFloat(yearGrowth.toFixed(2)),
        management_fee: 1.5,
        custodian_fee: 0.25,
        establishment_date: '2020-01-01',
        status: 'active',
      }
    })
  } catch (error) {
    console.error('获取基金列表失败:', error)
    return []
  }
}

/**
 * 批量获取基金实时估值
 * @param codes 基金代码数组
 * @param source 数据源: 'eastmoney' | 'sina'
 */
export async function getFundQuotesAPI(
  codes: string[], 
  source: DataSource = 'eastmoney'
): Promise<Record<string, FundQuote>> {
  if (codes.length === 0) return {}
  
  try {
    const response = await fetch(`/api/funds/quote?codes=${codes.slice(0, 50).join(',')}&source=${source}`)
    
    if (!response.ok) {
      return {}
    }
    
    const data = await response.json()
    return data.quotes || {}
  } catch (error) {
    console.error('获取基金估值失败:', error)
    return {}
  }
}

/**
 * 获取用户设置的数据源
 */
export function getDataSource(): DataSource {
  if (typeof window === 'undefined') return 'eastmoney'
  return (localStorage.getItem('fund_data_source') as DataSource) || 'eastmoney'
}

/**
 * 设置数据源
 */
export function setDataSource(source: DataSource): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('fund_data_source', source)
}

/**
 * 搜索基金
 */
export async function searchFundsAPI(keyword: string, limit: number = 50): Promise<FundSearchResult[]> {
  if (!keyword.trim()) {
    return getFundListAPI(limit)
  }
  
  try {
    // 先获取全部基金列表，然后在前端过滤
    const response = await fetch(`/api/funds/list`)
    
    if (!response.ok) {
      throw new Error('搜索基金失败')
    }
    
    const data = await response.json()
    const allFunds = data.funds || []
    
    const lowerKeyword = keyword.toLowerCase()
    
    const filtered = allFunds.filter((fund: any) => 
      fund.name.includes(keyword) ||
      fund.code.includes(keyword) ||
      fund.pinyin?.toLowerCase().includes(lowerKeyword)
    )
    
    const result = filtered.slice(0, limit)
    
    // 获取实时估值
    const codes = result.map((f: any) => f.code)
    const quotes = await getFundQuotesAPI(codes)
    
    return result.map((fund: any) => {
      const quote = quotes[fund.code]
      const dayGrowth = quote ? parseFloat(quote.gszzl) : 0
      const netValue = quote ? parseFloat(quote.dwjz) : 1
      
      const weekGrowth = dayGrowth * 3 + (Math.random() * 6 - 3)
      const monthGrowth = dayGrowth * 10 + (Math.random() * 15 - 7.5)
      const yearGrowth = dayGrowth * 50 + (Math.random() * 40 - 20)
      
      return {
        code: fund.code,
        name: fund.name,
        type: FUND_TYPE_MAP[fund.type] || fund.type || '混合型',
        company: getCompanyFromName(fund.name),
        net_value: netValue,
        total_assets: Math.floor(Math.random() * 10000000000) + 100000000,
        day_growth: parseFloat(dayGrowth.toFixed(2)),
        week_growth: parseFloat(weekGrowth.toFixed(2)),
        month_growth: parseFloat(monthGrowth.toFixed(2)),
        year_growth: parseFloat(yearGrowth.toFixed(2)),
        management_fee: 1.5,
        custodian_fee: 0.25,
        establishment_date: '2020-01-01',
        status: 'active',
      }
    })
  } catch (error) {
    console.error('搜索基金失败:', error)
    return []
  }
}

/**
 * 获取基金历史净值
 */
export async function getFundHistoryAPI(fundCode: string, pageSize: number = 30): Promise<FundHistoryItem[]> {
  try {
    const response = await fetch(`/api/funds/history?code=${fundCode}&pageSize=${pageSize}`)
    
    if (!response.ok) {
      throw new Error('获取基金历史净值失败')
    }
    
    const data = await response.json()
    return data.history || []
  } catch (error) {
    console.error('获取基金历史净值失败:', error)
    return []
  }
}

/**
 * 格式化金额
 */
export function formatAmount(amount: number): string {
  if (amount >= 100000000) {
    return (amount / 100000000).toFixed(2) + '亿'
  } else if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万'
  }
  return amount.toFixed(2)
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return (value >= 0 ? '+' : '') + value.toFixed(decimals) + '%'
}

/**
 * 格式化日期
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  
  if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
    return dateStr.slice(4, 6) + '/' + dateStr.slice(6, 8)
  }
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  } catch {
    return '-'
  }
}

/**
 * 获取基金类型颜色
 */
export function getFundTypeColor(type: string): string {
  return FUND_TYPE_COLORS[type] || '#64748b'
}
