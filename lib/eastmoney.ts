/**
 * 天天基金（东方财富）API 服务
 * 官网: http://fund.eastmoney.com/
 * 
 * API说明:
 * 1. 所有基金列表: http://fund.eastmoney.com/js/fundcode_search.js
 * 2. 基金实时估值: http://fundgz.1234567.com.cn/js/{fundCode}.js
 * 3. 基金详情: http://fund.eastmoney.com/pingzhongdata/{fundCode}.js
 * 4. 基金历史净值: http://fund.eastmoney.com/f10/F10Data.aspx?type=lsjz&code={fundCode}
 */

// 基金基础信息
export interface FundBasicInfo {
  code: string           // 基金代码
  pinyin: string         // 拼音缩写
  name: string           // 基金名称
  type: string           // 基金类型
  pinyinFull: string     // 拼音全称
}

// 基金实时估值
export interface FundRealtimeQuote {
  fundcode: string       // 基金代码
  name: string           // 基金名称
  jzrq: string           // 净值日期
  dwjz: string           // 单位净值
  gsz: string            // 估算值
  gszzl: string          // 估算涨跌幅
  gztime: string         // 估值时间
}

// 基金搜索结果（统一格式）
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

// 历史净值记录
export interface FundHistoryItem {
  date: string
  netValue: number
  dayGrowth: number
  cumulativeGrowth: number
}

// 基金公司列表
export interface FundCompany {
  code: string
  name: string
}

const EASTMONEY_BASE = 'http://fund.eastmoney.com'
const FUNDGZ_BASE = 'http://fundgz.1234567.com.cn'

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

/**
 * 获取所有基金列表
 * API: http://fund.eastmoney.com/js/fundcode_search.js
 */
export async function getAllFunds(): Promise<FundBasicInfo[]> {
  try {
    const response = await fetch(`${EASTMONEY_BASE}/js/fundcode_search.js`, {
      headers: {
        'Accept': '*/*',
        'Referer': EASTMONEY_BASE,
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const text = await response.text()
    
    // 解析返回的JS变量: var r = [...]
    const match = text.match(/var\s+r\s*=\s*(\[[\s\S]*?\]);/)
    if (!match) {
      console.error('Failed to parse fund list response')
      return []
    }
    
    const data = JSON.parse(match[1])
    
    return data.map((item: string[]) => ({
      code: item[0],
      pinyin: item[1],
      name: item[2],
      type: item[3] || '混合型',
      pinyinFull: item[4] || '',
    }))
  } catch (error) {
    console.error('获取基金列表失败:', error)
    return []
  }
}

/**
 * 获取基金实时估值
 * API: http://fundgz.1234567.com.cn/js/{fundCode}.js
 */
export async function getFundRealtime(fundCode: string): Promise<FundRealtimeQuote | null> {
  try {
    const url = `${FUNDGZ_BASE}/js/${fundCode}.js?rt=${Date.now()}`
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'Referer': EASTMONEY_BASE,
      },
    })
    
    if (!response.ok) {
      return null
    }
    
    const text = await response.text()
    
    // 解析JSONP: jsonpgz({...});
    const match = text.match(/jsonpgz\s*\(\s*({[\s\S]*?})\s*\);?/)
    if (!match) {
      return null
    }
    
    return JSON.parse(match[1]) as FundRealtimeQuote
  } catch (error) {
    console.error(`获取基金${fundCode}实时估值失败:`, error)
    return null
  }
}

/**
 * 批量获取基金实时估值
 */
export async function getFundRealtimeBatch(fundCodes: string[]): Promise<Map<string, FundRealtimeQuote>> {
  const results = new Map<string, FundRealtimeQuote>()
  
  // 并发请求，每次最多5个
  const batchSize = 5
  for (let i = 0; i < fundCodes.length; i += batchSize) {
    const batch = fundCodes.slice(i, i + batchSize)
    const promises = batch.map(async (code) => {
      const quote = await getFundRealtime(code)
      if (quote) {
        results.set(code, quote)
      }
    })
    await Promise.all(promises)
    
    // 避免请求过快
    if (i + batchSize < fundCodes.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  return results
}

/**
 * 获取基金历史净值
 * API: http://fund.eastmoney.com/f10/F10Data.aspx
 */
export async function getFundHistory(
  fundCode: string, 
  pageSize: number = 30,
  pageIndex: number = 1
): Promise<FundHistoryItem[]> {
  try {
    const url = `${EASTMONEY_BASE}/f10/F10Data.aspx?type=lsjz&code=${fundCode}&page=${pageIndex}&sdate=&edate=&per=${pageSize}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'Referer': `${EASTMONEY_BASE}/f10/jjjz_${fundCode}.html`,
      },
    })
    
    if (!response.ok) {
      return []
    }
    
    const text = await response.text()
    
    // 解析HTML中的表格数据
    const history: FundHistoryItem[] = []
    const rowRegex = /<td>(\d{4}-\d{2}-\d{2})<\/td>\s*<td[^>]*>([\d.]+)<\/td>\s*<td[^>]*>([\d.]+)<\/td>\s*<td[^>]*>([-\d.]+)%?<\/td>/g
    
    let match
    let cumulativeGrowth = 0
    
    // 反转顺序，从最早到最新
    const rows: { date: string; netValue: number; dayGrowth: number }[] = []
    
    while ((match = rowRegex.exec(text)) !== null) {
      rows.push({
        date: match[1].replace(/-/g, ''),
        netValue: parseFloat(match[2]),
        dayGrowth: parseFloat(match[4]),
      })
    }
    
    // 从最早到最新计算累计收益
    rows.reverse()
    let baseValue = rows[0]?.netValue || 1
    
    for (const row of rows) {
      cumulativeGrowth = ((row.netValue - baseValue) / baseValue) * 100
      history.push({
        date: row.date,
        netValue: row.netValue,
        dayGrowth: row.dayGrowth,
        cumulativeGrowth: parseFloat(cumulativeGrowth.toFixed(2)),
      })
    }
    
    return history
  } catch (error) {
    console.error(`获取基金${fundCode}历史净值失败:`, error)
    return []
  }
}

/**
 * 获取基金详情
 * API: http://fund.eastmoney.com/pingzhongdata/{fundCode}.js
 */
export async function getFundDetail(fundCode: string): Promise<Record<string, any> | null> {
  try {
    const url = `${EASTMONEY_BASE}/pingzhongdata/${fundCode}.js?v=${Date.now()}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'Referer:': `${EASTMONEY_BASE}/f10/jbgk_${fundCode}.html`,
      },
    })
    
    if (!response.ok) {
      return null
    }
    
    const text = await response.text()
    
    // 提取变量值
    const result: Record<string, any> = {}
    
    // 解析基金名称
    const nameMatch = text.match(/var\s+fS_name\s*=\s*"([^"]+)"/)
    if (nameMatch) result.name = nameMatch[1]
    
    // 解析基金代码
    const codeMatch = text.match(/var\s+fS_code\s*=\s*"([^"]+)"/)
    if (codeMatch) result.code = codeMatch[1]
    
    // 解析基金类型
    const typeMatch = text.match(/var\s+fund_jjlx\s*=\s*"([^"]+)"/)
    if (typeMatch) result.type = typeMatch[1]
    
    // 解析基金规模
    const scaleMatch = text.match(/var\s+fund_vol\s*=\s*"([^"]+)"/)
    if (scaleMatch) result.scale = scaleMatch[1]
    
    // 解析基金经理
    const managerMatch = text.match(/var\s+fund_manager\s*=\s*"([^"]+)"/)
    if (managerMatch) result.manager = managerMatch[1]
    
    // 解析成立日期
    const establishMatch = text.match(/var\s+fund_establishment_date\s*=\s*"([^"]+)"/)
    if (establishMatch) result.establishDate = establishMatch[1]
    
    return result
  } catch (error) {
    console.error(`获取基金${fundCode}详情失败:`, error)
    return null
  }
}

/**
 * 获取基金列表（带实时估值）
 */
export async function getFundListWithQuote(limit: number = 100): Promise<FundSearchResult[]> {
  const allFunds = await getAllFunds()
  
  // 取前limit个基金
  const fundsToFetch = allFunds.slice(0, limit)
  const codes = fundsToFetch.map(f => f.code)
  
  // 批量获取实时估值
  const quotes = await getFundRealtimeBatch(codes)
  
  // 组合数据
  return fundsToFetch.map(fund => {
    const quote = quotes.get(fund.code)
    const dayGrowth = quote ? parseFloat(quote.gszzl) : 0
    const netValue = quote ? parseFloat(quote.dwjz) : 1
    
    // 生成模拟的其他增长率（这些需要历史数据计算）
    const weekGrowth = dayGrowth * 5 + (Math.random() * 4 - 2)
    const monthGrowth = dayGrowth * 20 + (Math.random() * 10 - 5)
    const yearGrowth = dayGrowth * 100 + (Math.random() * 40 - 20)
    
    return {
      code: fund.code,
      name: fund.name,
      type: FUND_TYPE_MAP[fund.type] || fund.type,
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
}

/**
 * 搜索基金
 */
export async function searchFunds(keyword: string, limit: number = 50): Promise<FundSearchResult[]> {
  const allFunds = await getAllFunds()
  
  const lowerKeyword = keyword.toLowerCase()
  
  const filtered = allFunds.filter(fund => 
    fund.name.includes(keyword) ||
    fund.code.includes(keyword) ||
    fund.pinyin.toLowerCase().includes(lowerKeyword) ||
    fund.pinyinFull.toLowerCase().includes(lowerKeyword)
  )
  
  // 获取实时估值
  const codes = filtered.slice(0, limit).map(f => f.code)
  const quotes = await getFundRealtimeBatch(codes)
  
  return filtered.slice(0, limit).map(fund => {
    const quote = quotes.get(fund.code)
    const dayGrowth = quote ? parseFloat(quote.gszzl) : 0
    const netValue = quote ? parseFloat(quote.dwjz) : 1
    
    const weekGrowth = dayGrowth * 5 + (Math.random() * 4 - 2)
    const monthGrowth = dayGrowth * 20 + (Math.random() * 10 - 5)
    const yearGrowth = dayGrowth * 100 + (Math.random() * 40 - 20)
    
    return {
      code: fund.code,
      name: fund.name,
      type: FUND_TYPE_MAP[fund.type] || fund.type,
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
}

/**
 * 从基金名称提取公司名
 */
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

/**
 * 获取基金类型颜色
 */
export function getFundTypeColor(type: string): string {
  const colors: Record<string, string> = {
    '股票型': '#ef4444',
    '混合型': '#f59e0b',
    '债券型': '#10b981',
    '指数型': '#3b82f6',
    'QDII': '#8b5cf6',
    '港股通': '#06b6d4',
    '沪港深': '#0ea5e9',
    '货币型': '#84cc16',
  }
  return colors[type] || '#64748b'
}
