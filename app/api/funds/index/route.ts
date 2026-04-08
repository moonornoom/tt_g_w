import { NextRequest, NextResponse } from 'next/server'

/**
 * 获取指数基金历史净值（用于基准对比线）
 * 数据源: http://fund.eastmoney.com/pingzhongdata/{code}.js
 * 
 * 默认 code=510300 (沪深300ETF)
 * 参数: sdate, edate, code (可选，默认沪深300)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code') || '510300'
  const sdate = searchParams.get('sdate') || ''
  const edate = searchParams.get('edate') || ''

  try {
    const url = `http://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`

    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `http://fund.eastmoney.com/`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch index data' }, { status: response.status })
    }

    const text = await response.text()

    const match = text.match(/var\s+Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/)
    if (!match) {
      return NextResponse.json({ history: [], total: 0 })
    }

    const rawData: { x: number; y: number }[] = JSON.parse(match[1])

    const startDate = sdate ? new Date(sdate).getTime() : 0
    const endDate = edate ? new Date(edate + 'T23:59:59').getTime() : Infinity

    const filtered = rawData.filter(item => item.x >= startDate && item.x <= endDate)

    // 归一化：以区间首日为基准 100%，计算后续涨跌幅
    const baseValue = filtered[0]?.y || 1
    const history = filtered.map(item => {
      const d = new Date(item.x)
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('')
      return {
        date: dateStr,
        change: parseFloat((((item.y - baseValue) / baseValue) * 100).toFixed(2)),
      }
    })

    return NextResponse.json({ history, total: history.length })
  } catch (error) {
    console.error('获取指数基准数据失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
