import { NextRequest, NextResponse } from 'next/server'
import { fetchSinaFundQuotes, DataSource } from '@/lib/sina-client'

// 禁用此路由的缓存，确保实时数据
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * 获取基金实时估值
 * 
 * 支持多数据源:
 * - eastmoney: 天天基金 (默认，仅交易时间更新)
 * - sina: 新浪财经 (非交易时间也有数据)
 * 
 * Query params:
 * - codes: 基金代码，逗号分隔
 * - source: 数据源 eastmoney | sina (默认 eastmoney)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const codes = searchParams.get('codes')?.split(',').filter(Boolean) || []
  const source: DataSource = (searchParams.get('source') as DataSource) || 'eastmoney'
  
  if (codes.length === 0) {
    return NextResponse.json({ error: 'No fund codes provided' }, { status: 400 })
  }
  
  try {
    const quotes: Record<string, any> = {}
    const fetchTime = new Date().toISOString()
    
    if (source === 'sina') {
      // 使用新浪数据源
      const sinaQuotes = await fetchSinaFundQuotes(codes)
      
      for (const [code, quote] of Object.entries(sinaQuotes)) {
        quotes[code] = {
          ...quote,
          source: 'sina'
        }
      }
    } else {
      // 使用天天基金数据源
      const promises = codes.map(async (code) => {
        try {
          // 添加时间戳防缓存，禁用 fetch 缓存
          const response = await fetch(`http://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`, {
            headers: {
              'Accept': '*/*',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'http://fund.eastmoney.com/',
              'Cache-Control': 'no-cache',
            },
            cache: 'no-store', // 禁用缓存
          })
          
          if (!response.ok) return
          
          const text = await response.text()
          
          // 解析JSONP: jsonpgz({...});
          const match = text.match(/jsonpgz\s*\(\s*({[\s\S]*?})\s*\);?/)
          if (match) {
            quotes[code] = {
              ...JSON.parse(match[1]),
              source: 'eastmoney'
            }
          }
        } catch (e) {
          console.error(`获取基金${code}估值失败:`, e)
        }
      })
      
      await Promise.all(promises)
    }
    
    return NextResponse.json({ 
      quotes, 
      source,
      fetchTime,  // 返回请求时间，方便调试
      count: Object.keys(quotes).length 
    })
  } catch (error) {
    console.error('获取基金估值失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
