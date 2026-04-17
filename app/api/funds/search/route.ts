import { NextRequest, NextResponse } from 'next/server'

// 服务端内存缓存：基金列表（5分钟 TTL）
let fundListCache: { raw: any[]; expires: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

async function fetchFundList(): Promise<any[]> {
  if (fundListCache && Date.now() < fundListCache.expires) {
    return fundListCache.raw
  }

  const response = await fetch('http://fund.eastmoney.com/js/fundcode_search.js', {
    headers: {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'http://fund.eastmoney.com/',
    },
    cache: 'no-store',
  })

  if (!response.ok) return fundListCache?.raw || []

  const text = await response.text()
  const match = text.match(/var\s+r\s*=\s*(\[[\s\S]*?\]);/)
  if (!match) return fundListCache?.raw || []

  const data = JSON.parse(match[1])
  const funds = data.map((item: string[]) => ({
    code: item[0],
    pinyin: item[1],
    name: item[2],
    type: item[3] || '混合型',
  }))

  fundListCache = { raw: funds, expires: Date.now() + CACHE_TTL }
  return funds
}

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword') || ''
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 100)

  if (!keyword.trim()) {
    return NextResponse.json({ funds: [], total: 0 })
  }

  try {
    const allFunds = await fetchFundList()
    const lowerKeyword = keyword.toLowerCase()

    const filtered = allFunds.filter((fund: any) =>
      fund.name.includes(keyword) ||
      fund.code.includes(keyword) ||
      fund.pinyin?.toLowerCase().includes(lowerKeyword)
    )

    return NextResponse.json({ funds: filtered.slice(0, limit), total: filtered.length })
  } catch (error) {
    console.error('搜索基金失败:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
}
