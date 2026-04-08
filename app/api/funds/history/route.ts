import { NextRequest, NextResponse } from 'next/server'

/**
 * 获取基金历史净值
 * 数据源: http://fund.eastmoney.com/pingzhongdata/{code}.js
 * 
 * 返回 Data_netWorthTrend: [{x: timestamp_ms, y: netValue, equityReturn: dayGrowth%}]
 * 全量历史数据，服务端按 sdate/edate 过滤
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const pageSize = parseInt(searchParams.get('pageSize') || '30')
  const sdate = searchParams.get('sdate') || ''
  const edate = searchParams.get('edate') || ''

  if (!code) {
    return NextResponse.json({ error: 'No fund code provided' }, { status: 400 })
  }

  try {
    const url = `http://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`

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

    // 解析 Data_netWorthTrend = [{x: timestamp_ms, y: netValue, equityReturn: dayGrowth%}, ...]
    const match = text.match(/var\s+Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/)
    if (!match) {
      return NextResponse.json({ history: [], total: 0 })
    }

    const rawData: { x: number; y: number; equityReturn: number }[] = JSON.parse(match[1])

    // 转换格式 + 按日期过滤
    const startDate = sdate ? new Date(sdate).getTime() : 0
    const endDate = edate ? new Date(edate + 'T23:59:59').getTime() : Infinity

    let filtered = rawData.filter(item => item.x >= startDate && item.x <= endDate)

    // 如果没有日期过滤，取最后 pageSize 条
    if (!sdate && !edate) {
      filtered = filtered.slice(-pageSize)
    }

    // 格式化：YYYYMMDD
    const history = filtered.map(item => {
      const d = new Date(item.x)
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('')
      return {
        date: dateStr,
        netValue: item.y,
        dayGrowth: parseFloat((item.equityReturn ?? 0).toFixed(2)),
      }
    })

    // 计算累计收益（基于区间首日净值）
    const baseValue = history[0]?.netValue || 1
    const result = history.map(row => ({
      date: row.date,
      netValue: row.netValue,
      dayGrowth: row.dayGrowth,
      cumulativeGrowth: parseFloat((((row.netValue - baseValue) / baseValue) * 100).toFixed(2)),
    }))

    return NextResponse.json({ history: result, total: result.length })
  } catch (error) {
    console.error('获取基金历史净值失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
