import { NextRequest, NextResponse } from 'next/server'

/**
 * 获取所有基金列表
 * 代理: http://fund.eastmoney.com/js/fundcode_search.js
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch('http://fund.eastmoney.com/js/fundcode_search.js', {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'http://fund.eastmoney.com/',
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch fund list' }, { status: response.status })
    }
    
    const text = await response.text()
    
    // 解析返回的JS变量: var r = [...]
    const match = text.match(/var\s+r\s*=\s*(\[[\s\S]*?\]);/)
    if (!match) {
      return NextResponse.json({ error: 'Failed to parse fund list' }, { status: 500 })
    }
    
    const data = JSON.parse(match[1])
    
    // 转换为更友好的格式
    const funds = data.map((item: string[]) => ({
      code: item[0],
      pinyin: item[1],
      name: item[2],
      type: item[3] || '混合型',
    }))
    
    return NextResponse.json({ funds, total: funds.length })
  } catch (error) {
    console.error('获取基金列表失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
