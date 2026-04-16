import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FUND_TYPE_MAP: Record<string, string> = {
  '001': '股票型',
  '002': '混合型',
  '003': '债券型',
  '005': '指数型',
  '007': 'QDII',
  '006': 'LOF',
  '014': 'FOF',
}

/**
 * 基金排行榜
 * 代理: EastMoney FundMNRank API
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = searchParams.get('page') || '1'
  const pageSize = searchParams.get('pageSize') || '40'
  const sortColumn = searchParams.get('sort') || 'SYL_JN'
  const sortOrder = searchParams.get('order') || 'desc'
  const fundType = searchParams.get('fundType') || '0'

  try {
    const apiUrl = new URL('https://fundmobapi.eastmoney.com/FundMNewApi/FundMNRank')
    apiUrl.searchParams.set('fundtype', fundType)
    apiUrl.searchParams.set('SortColumn', sortColumn)
    apiUrl.searchParams.set('Sort', sortOrder)
    apiUrl.searchParams.set('pageIndex', page)
    apiUrl.searchParams.set('pageSize', pageSize)
    apiUrl.searchParams.set('plat', 'Android')
    apiUrl.searchParams.set('appType', 'ttjj')
    apiUrl.searchParams.set('product', 'EFund')
    apiUrl.searchParams.set('Version', '1')
    apiUrl.searchParams.set('deviceid', 'fund-compare-web')

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch ranking' }, { status: response.status })
    }

    const data = await response.json()

    if (!data.Success || !data.Datas) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 })
    }

    const parseNum = (v: string | null | undefined): number => {
      if (v === null || v === undefined || v === '--' || v === '') return 0
      const n = parseFloat(v)
      return isNaN(n) ? 0 : n
    }

    const funds = data.Datas.map((item: any) => ({
      code: item.FCODE,
      name: item.SHORTNAME,
      fundType: FUND_TYPE_MAP[item.FUNDTYPE] || item.BFUNDTYPE || '其他',
      date: item.FSRQ,
      dailyGrowth: parseNum(item.RZDF),
      netValue: parseNum(item.DWJZ),
      totalNetValue: parseNum(item.LJJZ),
      weekReturn: parseNum(item.SYL_Z),
      monthReturn: parseNum(item.SYL_Y),
      threeMonthReturn: parseNum(item.SYL_3Y),
      sixMonthReturn: parseNum(item.SYL_6Y),
      yearReturn: parseNum(item.SYL_1N),
      twoYearReturn: parseNum(item.SYL_2N),
      threeYearReturn: parseNum(item.SYL_3N),
      ytdReturn: parseNum(item.SYL_JN),
      sinceInception: parseNum(item.SYL_LN),
    }))

    return NextResponse.json({
      funds,
      total: data.TotalCount || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    })
  } catch (error) {
    console.error('获取基金排行榜失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
