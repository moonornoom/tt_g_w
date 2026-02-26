'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getFundHistoryAPI, getFundListAPI, FundHistoryItem, FundSearchResult } from '@/lib/eastmoney-client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { 
  Card,
  Button,
  FundTypeBadge,
  GrowthText,
  Loading,
  FullScreenLoading
} from '@/components/ui'

interface FundInfo {
  code: string
  name: string
  type: string
  company: string
  history: FundHistoryItem[]
}

// 图表配色
const CHART_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']

function CompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [funds, setFunds] = useState<FundInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [allFunds, setAllFunds] = useState<FundSearchResult[]>([])

  const fundCodes = searchParams.get('funds')?.split(',').filter(Boolean) || []

  useEffect(() => {
    const loadAllFunds = async () => {
      const data = await getFundListAPI(500)
      setAllFunds(data)
    }
    loadAllFunds()
  }, [])

  useEffect(() => {
    if (fundCodes.length === 0) {
      setLoading(false)
      return
    }
    loadFundsHistory()
  }, [fundCodes.join(','), days, allFunds.length])

  const loadFundsHistory = async () => {
    setLoading(true)
    try {
      const fundPromises = fundCodes.map(async (code) => {
        const history = await getFundHistoryAPI(code, days)
        const fundInfo = allFunds.find(f => f.code === code)
        return { 
          code, 
          name: fundInfo?.name || '基金' + code, 
          type: fundInfo?.type || '混合型',
          company: fundInfo?.company || '未知',
          history: history || [] 
        }
      })
      const fundResults = await Promise.all(fundPromises)
      setFunds(fundResults)
    } catch (error) {
      console.error('加载基金历史数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const chartData = funds[0]?.history?.map((item, index) => {
    const dataPoint: Record<string, any> = { date: item.date }
    funds.forEach((fund, idx) => {
      dataPoint['fund' + idx] = fund.history[index]?.cumulativeGrowth || 0
    })
    return dataPoint
  }) || []

  // 计算统计数据
  const stats = funds.map(fund => {
    const history = fund.history || []
    const latest = history[history.length - 1]
    const first = history[0]
    const maxNav = Math.max(...history.map(h => h.netValue))
    const minNav = Math.min(...history.map(h => h.netValue))
    return {
      code: fund.code,
      name: fund.name,
      type: fund.type,
      company: fund.company,
      netValue: latest?.netValue || 0,
      cumulativeGrowth: latest?.cumulativeGrowth || 0,
      dayGrowth: latest?.dayGrowth || 0,
      maxNav,
      minNav,
      volatility: first && latest ? ((maxNav - minNav) / first.netValue * 100).toFixed(2) : '0.00'
    }
  })

  if (fundCodes.length === 0) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-bg-card border border-[#2a2a3a] flex items-center justify-center">
            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">未选择基金</h2>
          <p className="text-text-secondary mb-6">请先选择要对比的基金</p>
          <Button onClick={() => router.push('/')}>
            返回首页
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <FullScreenLoading text="加载中..." />
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 顶部导航 */}
      <header className="header">
        <div className="max-w-container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push('/')} 
              className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>返回</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">基金对比</h1>
                <p className="text-xs text-text-muted">{funds.length} 只基金</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">时间范围</span>
              <select 
                value={days} 
                onChange={(e) => setDays(Number(e.target.value))} 
                className="px-3 py-1.5 bg-bg-card border border-[#2a2a3a] rounded-lg text-text-primary text-sm focus:outline-none focus:border-[#3a3a4a]"
              >
                <option value={7}>近7天</option>
                <option value={30}>近1月</option>
                <option value={90}>近3月</option>
                <option value={180}>近6月</option>
                <option value={365}>近1年</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-container mx-auto p-6">
        {/* 图表区域 */}
        <Card className="!p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">累计收益走势</h2>
              <p className="text-sm text-text-secondary">对比各基金历史表现</p>
            </div>
            <div className="flex items-center gap-4">
              {funds.map((fund, index) => (
                <div key={fund.code} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                  <span className="text-sm text-text-secondary max-w-[100px] truncate">{fund.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(v) => {
                    if (!v || v.length !== 8) return ''
                    return v.slice(4, 6) + '/' + v.slice(6, 8)
                  }}
                  stroke="#4a4a5a"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(v) => v.toFixed(0) + '%'}
                  stroke="#4a4a5a"
                  fontSize={12}
                />
                <Tooltip 
                  labelFormatter={(l) => {
                    if (!l || l.length !== 8) return l
                    return l.slice(0, 4) + '-' + l.slice(4, 6) + '-' + l.slice(6, 8)
                  }}
                  formatter={(v) => [Number(v).toFixed(2) + '%', '收益率']}
                  contentStyle={{
                    backgroundColor: '#1a1a25',
                    border: '1px solid #2a2a3a',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#a0a0b0' }}
                />
                {funds.map((fund, index) => (
                  <Line 
                    key={fund.code} 
                    type="monotone" 
                    dataKey={'fund' + index}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]} 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-text-muted">暂无数据</div>
          )}
        </Card>

        {/* 基金对比卡片 */}
        <h2 className="text-lg font-bold text-white mb-4">详细对比</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Card key={stat.code} className="!p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  ></span>
                  <div>
                    <h3 className="font-medium text-white">{stat.name}</h3>
                    <p className="text-xs text-text-muted">{stat.code} · {stat.company}</p>
                  </div>
                </div>
                <FundTypeBadge type={stat.type} />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">单位净值</span>
                  <span className="font-bold text-lg text-white">¥{stat.netValue.toFixed(4)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">累计收益</span>
                  <GrowthText value={stat.cumulativeGrowth} className="font-bold text-lg" />
                </div>

                <div className="pt-4 border-t border-[#2a2a3a] grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-muted mb-1">日涨跌</p>
                    <GrowthText value={stat.dayGrowth} className="font-semibold" />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">波动率</p>
                    <p className="font-semibold text-text-secondary">{stat.volatility}%</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 对比表格 */}
        <Card className="!p-0 overflow-hidden">
          <div className="p-4 border-b border-[#2a2a3a]">
            <h2 className="text-lg font-bold text-white">指标对比表</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-secondary">
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">指标</th>
                  {stats.map((stat, index) => (
                    <th key={stat.code} className="px-4 py-3 text-center text-sm font-medium text-text-primary">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                        <span className="max-w-[80px] truncate">{stat.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#2a2a3a]">
                  <td className="px-4 py-3 text-sm text-text-secondary bg-bg-secondary/50">单位净值</td>
                  {stats.map((stat) => (
                    <td key={stat.code} className="px-4 py-3 text-center font-medium text-white">
                      ¥{stat.netValue.toFixed(4)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[#2a2a3a]">
                  <td className="px-4 py-3 text-sm text-text-secondary bg-bg-secondary/50">累计收益</td>
                  {stats.map((stat) => (
                    <td key={stat.code} className="px-4 py-3 text-center font-bold">
                      <GrowthText value={stat.cumulativeGrowth} />
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[#2a2a3a]">
                  <td className="px-4 py-3 text-sm text-text-secondary bg-bg-secondary/50">日涨跌幅</td>
                  {stats.map((stat) => (
                    <td key={stat.code} className="px-4 py-3 text-center font-medium">
                      <GrowthText value={stat.dayGrowth} />
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[#2a2a3a]">
                  <td className="px-4 py-3 text-sm text-text-secondary bg-bg-secondary/50">基金类型</td>
                  {stats.map((stat) => (
                    <td key={stat.code} className="px-4 py-3 text-center">
                      <FundTypeBadge type={stat.type} />
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[#2a2a3a]">
                  <td className="px-4 py-3 text-sm text-text-secondary bg-bg-secondary/50">基金公司</td>
                  {stats.map((stat) => (
                    <td key={stat.code} className="px-4 py-3 text-center text-sm text-text-secondary">
                      {stat.company}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 底部 */}
      <footer className="border-t border-[#2a2a3a] py-4 text-center mt-8">
        <p className="text-xs text-text-muted">数据来源：天天基金 · 仅供参考，不构成投资建议</p>
      </footer>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<FullScreenLoading text="加载中..." />}>
      <CompareContent />
    </Suspense>
  )
}
