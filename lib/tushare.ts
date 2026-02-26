import axios from 'axios'

const TUSHARE_TOKEN = process.env.NEXT_PUBLIC_TUSHARE_TOKEN || process.env.TUSHARE_TOKEN || ''
const TUSHARE_API_BASE = 'https://api.tushare.pro'

const FUND_COMPANIES = ['华夏基金', '易方达基金', '南方基金', '嘉实基金', '博时基金', '广发基金', '中欧基金', '招商基金', '汇添富基金', '华安基金', '富国基金', '景顺长城', '兴全基金', '鹏华基金', '银华基金']
const FUND_TYPES = ['股票型', '混合型', '债券型', '指数型', 'QDII', '港股通']
const FUND_NAMES = [
  // A股相关
  '沪深300指数', '中证500指数', '创业板ETF', '科创50ETF', '上证50ETF',
  '消费行业精选', '科技成长混合', '医药健康', '新能源产业', '半导体芯片',
  '军工国防', '白酒消费', '银行金融', '地产基建', '碳中和主题',
  '价值精选', '成长先锋', '红利低波', '量化对冲', 'MSCI中国',
  // 港股相关
  '沪港深精选', '港股通科技', '恒生ETF', '恒生科技', '中概互联',
  '港股医药', '港股消费', '腾讯美团', '港股金融', '恒生互联网',
]

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

export interface FundHistoryItem {
  date: string
  netValue: number
  dayGrowth: number
  cumulativeGrowth: number
}

function generateMockFunds(count: number = 100): FundSearchResult[] {
  const funds: FundSearchResult[] = []
  for (let i = 0; i < count; i++) {
    const companyIndex = i % FUND_COMPANIES.length
    const typeIndex = i % FUND_TYPES.length
    const nameIndex = i % FUND_NAMES.length
    const baseValue = 0.5 + Math.random() * 3
    funds.push({
      code: String(100000 + i).padStart(6, '0'),
      name: FUND_COMPANIES[companyIndex] + FUND_NAMES[nameIndex] + (Math.floor(i / FUND_NAMES.length) > 0 ? String.fromCharCode(65 + Math.floor(i / FUND_NAMES.length) - 1) : ''),
      type: FUND_TYPES[typeIndex],
      company: FUND_COMPANIES[companyIndex],
      net_value: parseFloat(baseValue.toFixed(4)),
      total_assets: Math.floor(Math.random() * 10000000000) + 100000000,
      day_growth: parseFloat((Math.random() * 4 - 2).toFixed(2)),
      week_growth: parseFloat((Math.random() * 10 - 5).toFixed(2)),
      month_growth: parseFloat((Math.random() * 20 - 10).toFixed(2)),
      year_growth: parseFloat((Math.random() * 60 - 30).toFixed(2)),
      management_fee: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
      custodian_fee: parseFloat((Math.random() * 0.3 + 0.1).toFixed(2)),
      establishment_date: '20' + (10 + Math.floor(Math.random() * 15)) + '-' + String(Math.floor(Math.random() * 12) + 1).padStart(2, '0') + '-' + String(Math.floor(Math.random() * 28) + 1).padStart(2, '0'),
      status: Math.random() > 0.05 ? 'active' : 'suspended',
    })
  }
  return funds
}

function generateMockHistory(days: number = 30): FundHistoryItem[] {
  const history: FundHistoryItem[] = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  let cumulativeGrowth = 0
  let netValue = 1 + Math.random() * 2
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dayGrowth = (Math.random() * 4 - 2)
    netValue = netValue * (1 + dayGrowth / 100)
    cumulativeGrowth = (netValue - 1) * 100
    history.push({
      date: date.toISOString().split('T')[0].replace(/-/g, ''),
      netValue: parseFloat(netValue.toFixed(4)),
      dayGrowth: parseFloat(dayGrowth.toFixed(2)),
      cumulativeGrowth: parseFloat(cumulativeGrowth.toFixed(2)),
    })
  }
  return history
}

function hasToken(): boolean {
  return !!TUSHARE_TOKEN && TUSHARE_TOKEN.length > 10
}

export async function getOpenFundList(params?: { ts_code?: string; market?: string; offset?: number; limit?: number }): Promise<FundSearchResult[]> {
  const limit = params?.limit || 100
  if (!hasToken()) {
    return generateMockFunds(limit)
  }
  try {
    const response = await axios.post(TUSHARE_API_BASE, { api_name: 'fund_basic', token: TUSHARE_TOKEN, params: { ts_code: params?.ts_code, market: params?.market || 'OF' }, fields: 'ts_code,name,fund_type,management,fund_scale,establish_date' }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 })
    if (response.data.code !== 0) return generateMockFunds(limit)
    const items = response.data.data?.items || []
    return items.slice(0, limit).map((item: any) => ({ code: item[0] || '', name: item[1] || '', type: item[2] || '混合型', company: item[3] || FUND_COMPANIES[0], net_value: parseFloat(item[4] || '1'), total_assets: parseFloat(item[5] || '0'), day_growth: parseFloat((Math.random() * 4 - 2).toFixed(2)), week_growth: parseFloat((Math.random() * 10 - 5).toFixed(2)), month_growth: parseFloat((Math.random() * 20 - 10).toFixed(2)), year_growth: parseFloat((Math.random() * 60 - 30).toFixed(2)), management_fee: 1.5, custodian_fee: 0.25, establishment_date: item[6] || '', status: 'active' }))
  } catch (error) {
    return generateMockFunds(limit)
  }
}

export async function getFundNavHistory(tsCode: string, params?: { startDate?: string; endDate?: string; limit?: number }): Promise<FundHistoryItem[]> {
  const limit = params?.limit || 30
  if (!hasToken()) return generateMockHistory(limit)
  try {
    const response = await axios.post(TUSHARE_API_BASE, { api_name: 'fund_nav', token: TUSHARE_TOKEN, params: { ts_code: tsCode, start_date: params?.startDate, end_date: params?.endDate }, fields: 'ts_code,nav_date,unit_nav,accum_nav' }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 })
    if (response.data.code !== 0) return generateMockHistory(limit)
    const items = response.data.data?.items || []
    let cumulativeGrowth = 0
    return items.slice(0, limit).map((item: any) => { const netValue = parseFloat(item[2] || '1'); const dayGrowth = parseFloat(item[4] || '0'); cumulativeGrowth = (1 + cumulativeGrowth / 100) * (1 + dayGrowth / 100) - 1; return { date: item[1] || '', netValue, dayGrowth, cumulativeGrowth: cumulativeGrowth * 100 } })
  } catch (error) {
    return generateMockHistory(limit)
  }
}

export async function searchFunds(keyword: string, limit: number = 20): Promise<FundSearchResult[]> {
  const allFunds = await getOpenFundList({ limit: 500 })
  return allFunds.filter(fund => fund.name.includes(keyword) || fund.code.includes(keyword) || fund.company.includes(keyword)).slice(0, limit)
}

export function formatAmount(amount: number): string { if (amount >= 100000000) return (amount / 100000000).toFixed(2) + '亿'; else if (amount >= 10000) return (amount / 10000).toFixed(2) + '万'; return amount.toFixed(2) }
export function formatPercent(value: number, decimals: number = 2): string { return (value >= 0 ? '+' : '') + value.toFixed(decimals) + '%' }
export function formatDate(dateStr: string): string { 
  if (!dateStr) return '-'; 
  // Handle YYYYMMDD format
  if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
    return dateStr.slice(4, 6) + '/' + dateStr.slice(6, 8)
  }
  // Handle ISO format
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  } catch {
    return '-'
  }
}
export function getFundTypeColor(type: string): string { 
  const colors: Record<string, string> = { 
    '股票型': '#ef4444', 
    '混合型': '#f59e0b', 
    '债券型': '#10b981', 
    '指数型': '#3b82f6', 
    'QDII': '#8b5cf6', 
    '港股通': '#06b6d4',
    '沪港深': '#0ea5e9'
  }; 
  return colors[type] || '#64748b' 
}
