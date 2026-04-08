/**
 * 天天基金（东方财富）API 客户端
 * 通过 Next.js API Routes 代理调用，避免跨域问题
 */

import { FundSearchResult, FundQuote, FundHistoryItem, DataSource } from './types'

// 重新导出类型
export type { DataSource, FundSearchResult, FundQuote, FundHistoryItem } from './types'

// 客户端内存缓存：基金列表（5分钟 TTL），避免每次搜索都拉全量数据
let fundListCache: { raw: any[]; expires: number } | null = null
const FUND_LIST_CACHE_TTL = 5 * 60 * 1000

async function fetchRawFundList(): Promise<any[]> {
  if (fundListCache && Date.now() < fundListCache.expires) {
    return fundListCache.raw
  }
  // 基金列表允许服务端 5 分钟缓存（revalidate=300），但绕过浏览器缓存由客户端内存缓存统一控制
  const response = await fetch('/api/funds/list', { cache: 'no-store' })
  if (!response.ok) throw new Error('获取基金列表失败')
  const data = await response.json()
  const raw = data.funds || []
  fundListCache = { raw, expires: Date.now() + FUND_LIST_CACHE_TTL }
  return raw
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
 * 获取基金列表（仅真实数据）
 */
export async function getFundListAPI(limit: number = 100): Promise<FundSearchResult[]> {
  try {
    const allFunds = await fetchRawFundList()
    const funds = allFunds.slice(0, limit)
    
    // 获取实时估值
    const codes = funds.map((f: any) => f.code)
    const quotes = await getFundQuotesAPI(codes)
    
    // 组合数据（仅使用真实数据）
    return funds.map((fund: any) => {
      const quote = quotes[fund.code]
      const dayGrowth = quote ? parseFloat(quote.gszzl) : 0
      const netValue = quote ? parseFloat(quote.dwjz) : 1
      
      return {
        code: fund.code,
        name: fund.name,
        type: FUND_TYPE_MAP[fund.type] || fund.type || '混合型',
        company: getCompanyFromName(fund.name),
        netValue,
        dayGrowth: parseFloat(dayGrowth.toFixed(2)),
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
    // 行情数据必须实时，禁止任何层级的缓存
    const response = await fetch(`/api/funds/quote?codes=${codes.slice(0, 50).join(',')}&source=${source}`, {
      cache: 'no-store',
    })
    
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
 * 搜索基金（使用客户端缓存，避免重复拉全量列表）
 */
export async function searchFundsAPI(keyword: string, limit: number = 50): Promise<FundSearchResult[]> {
  if (!keyword.trim()) {
    return getFundListAPI(limit)
  }
  
  try {
    const allFunds = await fetchRawFundList()
    
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
      
      return {
        code: fund.code,
        name: fund.name,
        type: FUND_TYPE_MAP[fund.type] || fund.type || '混合型',
        company: getCompanyFromName(fund.name),
        netValue,
        dayGrowth: parseFloat(dayGrowth.toFixed(2)),
      }
    })
  } catch (error) {
    console.error('搜索基金失败:', error)
    return []
  }
}

/**
 * 获取基金历史净值
 * @param fundCode 基金代码
 * @param pageSizeOrOptions 页大小（数字）或选项对象（支持日期范围）
 */
export async function getFundHistoryAPI(
  fundCode: string,
  pageSizeOrOptions?: number | { pageSize?: number; startDate?: string; endDate?: string }
): Promise<FundHistoryItem[]> {
  try {
    let pageSize = 30
    let startDate = ''
    let endDate = ''

    if (typeof pageSizeOrOptions === 'number') {
      pageSize = pageSizeOrOptions
    } else if (pageSizeOrOptions) {
      pageSize = pageSizeOrOptions.pageSize ?? 30
      startDate = pageSizeOrOptions.startDate ?? ''
      endDate = pageSizeOrOptions.endDate ?? ''
    }

    const params = new URLSearchParams({
      code: fundCode,
      pageSize: String(pageSize),
    })
    if (startDate) params.set('sdate', startDate)
    if (endDate) params.set('edate', endDate)

    const response = await fetch(`/api/funds/history?${params.toString()}`)
    
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
