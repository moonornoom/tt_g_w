import { NextRequest, NextResponse } from 'next/server'

/**
 * 获取基金历史净值
 * 代理: http://fund.eastmoney.com/f10/F10Data.aspx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const pageSize = parseInt(searchParams.get('pageSize') || '30')
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
  
  if (!code) {
    return NextResponse.json({ error: 'No fund code provided' }, { status: 400 })
  }
  
  try {
    const url = `http://fund.eastmoney.com/f10/F10Data.aspx?type=lsjz&code=${code}&page=${pageIndex}&sdate=&edate=&per=${pageSize}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `http://fund.eastmoney.com/f10/jjjz_${code}.html`,
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: response.status })
    }
    
    const text = await response.text()
    
    // 解析HTML中的表格数据
    const history: { date: string; netValue: number; dayGrowth: number }[] = []
    const rowRegex = /<td>(\d{4}-\d{2}-\d{2})<\/td>\s*<td[^>]*>([\d.]+)<\/td>\s*<td[^>]*>([\d.]+)<\/td>\s*<td[^>]*>([-\d.]+)%?<\/td>/g
    
    let match
    while ((match = rowRegex.exec(text)) !== null) {
      history.push({
        date: match[1].replace(/-/g, ''),
        netValue: parseFloat(match[2]),
        dayGrowth: parseFloat(match[4]),
      })
    }
    
    // 反转顺序，从最早到最新
    history.reverse()
    
    // 计算累计收益
    const result: { date: string; netValue: number; dayGrowth: number; cumulativeGrowth: number }[] = []
    const baseValue = history[0]?.netValue || 1
    
    for (const row of history) {
      const cumulativeGrowth = ((row.netValue - baseValue) / baseValue) * 100
      result.push({
        date: row.date,
        netValue: row.netValue,
        dayGrowth: row.dayGrowth,
        cumulativeGrowth: parseFloat(cumulativeGrowth.toFixed(2)),
      })
    }
    
    return NextResponse.json({ history: result, total: result.length })
  } catch (error) {
    console.error('获取基金历史净值失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
