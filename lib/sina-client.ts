/**
 * 新浪财经基金数据源
 * 相比天天基金，新浪数据在非交易时间也有更新
 */

import * as iconv from 'iconv-lite'

// 新浪基金数据接口
const SINA_FUND_API = 'https://hq.sinajs.cn/list='

// 新浪基金数据格式
export interface SinaFundQuote {
  fundcode: string
  name: string
  jzrq: string      // 净值日期 (per_end_date)
  dwjz: string      // 单位净值 (nav)
  gsz: string       // 估算值 (nav_sub)
  gszzl: string     // 估算涨跌幅 (percentage)
  gztime: string    // 估值时间
}

/**
 * 解码新浪 GBK 编码的响应
 */
async function decodeSinaResponse(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer()
  return iconv.decode(Buffer.from(buffer), 'gbk')
}

/**
 * 从新浪获取单只基金实时数据
 */
export async function fetchSinaFundQuote(code: string): Promise<SinaFundQuote | null> {
  try {
    const response = await fetch(`${SINA_FUND_API}fu_${code}`, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://finance.sina.com.cn/',
      },
    })

    if (!response.ok) return null

    const text = await decodeSinaResponse(response)
    
    // 解析格式: var hq_str_fu_000001="华夏成长混合,000001,2025-02-12,1.2340,1.2450,0.89,..."
    const match = text.match(/var hq_str_fu_\d+="([^"]*)"/)
    if (!match) return null

    const data = match[1].split(',')
    if (data.length < 6) return null

    // 新浪数据字段: 基金名称,基金代码,净值日期,单位净值,估算净值,涨跌幅,...
    return {
      fundcode: code,
      name: data[0] || '',
      jzrq: data[2] || '',
      dwjz: data[3] || '0',
      gsz: data[4] || '0',
      gszzl: data[5] || '0',
      gztime: data[2] || '', // 新浪没有单独的估值时间字段
    }
  } catch (error) {
    console.error(`新浪获取基金${code}失败:`, error)
    return null
  }
}

/**
 * 批量从新浪获取基金实时数据
 */
export async function fetchSinaFundQuotes(codes: string[]): Promise<Record<string, SinaFundQuote>> {
  const quotes: Record<string, SinaFundQuote> = {}

  // 新浪支持批量请求，用逗号分隔
  // 但为了稳定性，分批请求
  const batchSize = 20
  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize)
    
    try {
      const symbols = batch.map(code => `fu_${code}`).join(',')
      const response = await fetch(`${SINA_FUND_API}${symbols}`, {
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://finance.sina.com.cn/',
        },
      })

      if (!response.ok) continue

      const text = await decodeSinaResponse(response)
      
      // 解析所有返回的数据
      const regex = /var hq_str_fu_(\d+)="([^"]*)"/g
      let match
      while ((match = regex.exec(text)) !== null) {
        const code = match[1]
        const data = match[2].split(',')
        
        if (data.length >= 6) {
          quotes[code] = {
            fundcode: code,
            name: data[0] || '',
            jzrq: data[2] || '',
            dwjz: data[3] || '0',
            gsz: data[4] || '0',
            gszzl: data[5] || '0',
            gztime: data[2] || '',
          }
        }
      }
    } catch (error) {
      console.error('新浪批量获取基金失败:', error)
    }
  }

  return quotes
}

/**
 * 数据源类型
 */
export type DataSource = 'eastmoney' | 'sina'

/**
 * 统一的基金报价接口
 */
export interface UnifiedFundQuote {
  fundcode: string
  name: string
  jzrq: string      // 净值日期
  dwjz: string      // 单位净值
  gsz: string       // 估算值
  gszzl: string     // 估算涨跌幅
  gztime: string    // 估值时间
  source: DataSource // 数据来源
}
