import { NextRequest, NextResponse } from 'next/server'
import { analyzeFundPortfolio, analyzeSingleFund } from '@/lib/glm-client'

/**
 * 基金分析 API
 * 
 * POST /api/analyze
 * 
 * Headers:
 * - X-GLM-API-Key: 可选，用户的 GLM API Key（优先使用）
 * 
 * Body:
 * - type: 'portfolio' | 'single'
 * - funds: 基金数据数组
 * - groupName?: 观察组名称
 */
export async function POST(request: NextRequest) {
  try {
    // 获取 API Key（优先从请求头获取，其次从环境变量）
    const headerApiKey = request.headers.get('X-GLM-API-Key')
    const apiKey = headerApiKey || process.env.GLM_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: '请先配置 GLM API Key（点击右上角设置按钮）' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, funds, groupName, fund } = body

    // 验证必要参数
    if (!type) {
      return NextResponse.json(
        { error: '缺少 type 参数' },
        { status: 400 }
      )
    }

    let analysis: string

    if (type === 'portfolio') {
      // 组合分析
      if (!funds || !Array.isArray(funds) || funds.length === 0) {
        return NextResponse.json(
          { error: '缺少基金数据' },
          { status: 400 }
        )
      }

      analysis = await analyzeFundPortfolio({
        funds: funds.map(f => ({
          code: f.code,
          name: f.name,
          type: f.type,
          dayGrowth: f.day_growth,
          monthGrowth: f.month_growth,
          yearGrowth: f.year_growth,
          netValue: f.net_value,
        })),
        groupName: groupName || '我的观察组',
        apiKey,
      })
    } else if (type === 'single') {
      // 单只基金分析
      if (!fund) {
        return NextResponse.json(
          { error: '缺少基金数据' },
          { status: 400 }
        )
      }

      analysis = await analyzeSingleFund({
        code: fund.code,
        name: fund.name,
        type: fund.type,
        company: fund.company,
        netValue: fund.net_value,
        dayGrowth: fund.day_growth,
        weekGrowth: fund.week_growth,
        monthGrowth: fund.month_growth,
        yearGrowth: fund.year_growth,
        totalAssets: fund.total_assets,
        apiKey,
      })
    } else {
      return NextResponse.json(
        { error: '不支持的分析类型' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('分析失败:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: '分析服务暂时不可用，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * GET 请求返回 API 说明
 */
export async function GET() {
  return NextResponse.json({
    name: '基金分析 API',
    version: '1.0.0',
    endpoints: {
      'POST /api/analyze': {
        description: '分析基金组合或单只基金',
        headers: {
          'X-GLM-API-Key': '可选，用户的 GLM API Key',
        },
        parameters: {
          type: {
            type: 'string',
            enum: ['portfolio', 'single'],
            description: '分析类型',
          },
          funds: {
            type: 'array',
            description: '基金列表（组合分析时使用）',
          },
          fund: {
            type: 'object',
            description: '单只基金数据（单基分析时使用）',
          },
          groupName: {
            type: 'string',
            description: '观察组名称（可选）',
          },
        },
      },
    },
  })
}
