'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, subDays } from 'date-fns'
import { getFundHistoryAPI, getFundListAPI, getFundQuotesAPI } from '@/lib/eastmoney-client'
import { FundHistoryItem, FundSearchResult } from '@/lib/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ComposedChart, Bar, TooltipProps,
} from 'recharts'
import { Card, GrowthText, FullScreenLoading } from '@/components/ui'

type Period = '5d' | '30d' | '100d' | '6m' | '1y'

const PERIODS: { key: Period; label: string; pageSize: number; days: number }[] = [
  { key: '5d', label: '5日', pageSize: 10, days: 7 },
  { key: '30d', label: '30日', pageSize: 30, days: 35 },
  { key: '100d', label: '100日', pageSize: 110, days: 115 },
  { key: '6m', label: '半年', pageSize: 130, days: 195 },
  { key: '1y', label: '1年', pageSize: 250, days: 370 },
]

function calcMA(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null
    const slice = data.slice(i - window + 1, i + 1)
    return parseFloat((slice.reduce((a, b) => a + b, 0) / window).toFixed(4))
  })
}

interface IndexData { date: string; change: number }

async function fetchIndexData(sdate: string, edate: string): Promise<IndexData[]> {
  try {
    const res = await fetch(`/api/funds/index?sdate=${sdate}&edate=${edate}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.history || []
  } catch { return [] }
}

function FundChartContent() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [period, setPeriod] = useState<Period>('100d')
  const [history, setHistory] = useState<FundHistoryItem[]>([])
  const [indexData, setIndexData] = useState<IndexData[]>([])
  const [fundInfo, setFundInfo] = useState<FundSearchResult | null>(null)
  const [loading, setLoading] = useState(true)

  // 图例可见性
  const SERIES = [
    { key: 'netValue', label: '净值', color: '' },
    { key: 'ma5', label: 'MA5', color: '#f59e0b' },
    { key: 'ma10', label: 'MA10', color: '#3b82f6' },
    { key: 'ma20', label: 'MA20', color: '#8b5cf6' },
    { key: 'hs300', label: '沪深300', color: '#60a5fa' },
  ] as const
  type SeriesKey = typeof SERIES[number]['key']
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    netValue: true, ma5: true, ma10: true, ma20: true, hs300: true,
  })
  const toggleSeries = (key: SeriesKey) => {
    const next = { ...visible, [key]: !visible[key] }
    if (Object.values(next).every(v => !v)) return
    setVisible(next)
  }

  // 预测器 state
  const [predictGrowth, setPredictGrowth] = useState<string>('')
  const [predictApplied, setPredictApplied] = useState(false)

  const periodConfig = PERIODS.find(p => p.key === period)!
  const startDate = format(subDays(new Date(), periodConfig.days), 'yyyy-MM-dd')
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    const loadFundInfo = async () => {
      const allFunds = await getFundListAPI(500)
      const found = allFunds.find(f => f.code === code)
      if (found) setFundInfo(found)
    }
    loadFundInfo()
  }, [code])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [fundHistory, idxData] = await Promise.all([
          getFundHistoryAPI(code, { pageSize: periodConfig.pageSize, startDate }),
          fetchIndexData(startDate, todayStr),
        ])
        setHistory(fundHistory)
        setIndexData(idxData)
        // 切换区间时重置预测
        setPredictApplied(false)
        setPredictGrowth('')
      } catch (error) {
        console.error('加载历史净值失败:', error)
        setHistory([])
        setIndexData([])
      } finally { setLoading(false) }
    }
    loadData()
  }, [code, period])

  // === 统计数据（不含预测点） ===
  const stats = useMemo(() => {
    if (history.length === 0) return null
    const latest = history[history.length - 1]
    const first = history[0]
    const netValues = history.map(h => h.netValue)
    const maxNav = Math.max(...netValues)
    const minNav = Math.min(...netValues)
    const avgNav = netValues.reduce((a, b) => a + b, 0) / netValues.length
    const periodChange = first.netValue > 0
      ? ((latest.netValue - first.netValue) / first.netValue) * 100 : 0
    const hs300Change = indexData.length >= 2 ? indexData[indexData.length - 1].change : null
    const excessReturn = hs300Change !== null ? periodChange - hs300Change : null
    return { latestNav: latest.netValue, periodChange, maxNav, minNav, avgNav, firstNav: first.netValue, startDate: first.date, endDate: latest.date, hs300Change, excessReturn }
  }, [history, indexData])

  // === 预测逻辑 ===
  const latestItem = history.length > 0 ? history[history.length - 1] : null

  const predictedNav = useMemo(() => {
    const nav = latestItem?.netValue
    const g = parseFloat(predictGrowth)
    if (!nav || isNaN(g)) return null
    return parseFloat((nav * (1 + g / 100)).toFixed(4))
  }, [latestItem, predictGrowth])

  const applyPrediction = async () => {
    if (!latestItem || predictApplied) return
    try {
      const quotes = await getFundQuotesAPI([code])
      const q = quotes[code]
      setPredictGrowth(q ? parseFloat(q.gszzl).toFixed(2) : '0.00')
    } catch { setPredictGrowth('0.00') }
  }

  const confirmPrediction = () => {
    if (predictedNav === null || predictApplied) return
    setPredictApplied(true)
  }

  const clearPrediction = () => {
    setPredictGrowth('')
    setPredictApplied(false)
  }

  // 波峰波谷
  const { lastPeak, lastTrough } = useMemo(() => {
    if (history.length < 3) return { lastPeak: null, lastTrough: null }
    let peak: { value: number; date: string } | null = null
    let trough: { value: number; date: string } | null = null
    for (let i = history.length - 2; i >= 1; i--) {
      const prev = history[i - 1].netValue, curr = history[i].netValue, next = history[i + 1].netValue
      if (curr >= prev && curr >= next && !peak) peak = { value: curr, date: history[i].date }
      if (curr <= prev && curr <= next && !trough) trough = { value: curr, date: history[i].date }
      if (peak && trough) break
    }
    if (!peak) { const v = Math.max(...history.map(h => h.netValue)); const it = history.find(h => h.netValue === v); if (it) peak = { value: v, date: it.date } }
    if (!trough) { const v = Math.min(...history.map(h => h.netValue)); const it = history.find(h => h.netValue === v); if (it) trough = { value: v, date: it.date } }
    return { lastPeak: peak, lastTrough: trough }
  }, [history])

  const peakDiff = predictedNav !== null && lastPeak
    ? parseFloat(((predictedNav - lastPeak.value) / lastPeak.value * 100).toFixed(2)) : null
  const troughDiff = predictedNav !== null && lastTrough
    ? parseFloat(((predictedNav - lastTrough.value) / lastTrough.value * 100).toFixed(2)) : null

  // 预测日均线和差值
  const predictMA = useMemo(() => {
    if (!predictApplied || predictedNav === null || history.length === 0) return null
    const allNavs = [...history.map(h => h.netValue), predictedNav]
    const n = allNavs.length
    return {
      ma5: n >= 5 ? parseFloat((allNavs.slice(-5).reduce((a, b) => a + b, 0) / 5).toFixed(4)) : null,
      ma10: n >= 10 ? parseFloat((allNavs.slice(-10).reduce((a, b) => a + b, 0) / 10).toFixed(4)) : null,
      ma20: n >= 20 ? parseFloat((allNavs.slice(-20).reduce((a, b) => a + b, 0) / 20).toFixed(4)) : null,
    }
  }, [predictApplied, predictedNav, history])

  const maDiffs = useMemo(() => {
    if (!predictApplied || predictedNav === null || !predictMA) return null
    const pct = (v: number, base: number) => parseFloat(((v - base) / base * 100).toFixed(2))
    return {
      vsMA5: predictMA.ma5 !== null ? pct(predictedNav, predictMA.ma5) : null,
      vsMA10: predictMA.ma10 !== null ? pct(predictedNav, predictMA.ma10) : null,
      vsMA20: predictMA.ma20 !== null ? pct(predictedNav, predictMA.ma20) : null,
    }
  }, [predictApplied, predictedNav, predictMA])

  // === chartData（最后计算，依赖上面的预测 state） ===
  const chartData = useMemo(() => {
    if (history.length === 0) return []

    const baseNavs = history.map(h => h.netValue)
    const extendedNavs = (predictApplied && predictedNav !== null) ? [...baseNavs, predictedNav] : baseNavs
    const ma5 = calcMA(extendedNavs, 5)
    const ma10 = calcMA(extendedNavs, 10)
    const ma20 = calcMA(extendedNavs, 20)
    const indexMap = new Map(indexData.map(d => [d.date, d.change]))

    const base = history.map((item, i) => ({
      date: item.date, netValue: item.netValue, dayGrowth: item.dayGrowth,
      cumulativeGrowth: item.cumulativeGrowth,
      ma5: ma5[i], ma10: ma10[i], ma20: ma20[i],
      hs300: indexMap.get(item.date) ?? null, isPredicted: false,
    }))

    if (predictApplied && predictedNav !== null) {
      const growth = parseFloat(predictGrowth)
      const lastHist = history[history.length - 1]
      const lastIdx = extendedNavs.length - 1
      const newCumGrowth = history[0].netValue > 0
        ? parseFloat((((predictedNav - history[0].netValue) / history[0].netValue) * 100).toFixed(2)) : 0
      // 下一交易日
      const lastDate = new Date(parseInt(lastHist.date.slice(0, 4)), parseInt(lastHist.date.slice(4, 6)) - 1, parseInt(lastHist.date.slice(6, 8)))
      lastDate.setDate(lastDate.getDate() + 1)
      while (lastDate.getDay() === 0 || lastDate.getDay() === 6) lastDate.setDate(lastDate.getDate() + 1)
      const predictDate = [lastDate.getFullYear(), String(lastDate.getMonth() + 1).padStart(2, '0'), String(lastDate.getDate()).padStart(2, '0')].join('')

      base.push({
        date: predictDate, netValue: predictedNav,
        dayGrowth: isNaN(growth) ? 0 : growth,
        cumulativeGrowth: newCumGrowth,
        ma5: ma5[lastIdx], ma10: ma10[lastIdx], ma20: ma20[lastIdx],
        hs300: null, isPredicted: true,
      })
    }
    return base
  }, [history, indexData, predictApplied, predictedNav, predictGrowth])

  const trendColor = (stats?.periodChange ?? 0) >= 0 ? '#ef4444' : '#22c55e'

  const fmtDate = (l: string | number) => { const val = String(l ?? ''); if (!val || val.length !== 8) return val; return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}` }

  // 自定义 Tooltip：补一天模式下显示与预测净值的差值
  const NavTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null
    const item = payload[0]?.payload
    if (!item) return null

    const rows: { label: string; value: string; color?: string }[] = []
    if (item.netValue != null) rows.push({ label: '单位净值', value: Number(item.netValue).toFixed(4) })
    if (item.ma5 != null) rows.push({ label: 'MA5', value: Number(item.ma5).toFixed(4) })
    if (item.ma10 != null) rows.push({ label: 'MA10', value: Number(item.ma10).toFixed(4) })
    if (item.ma20 != null) rows.push({ label: 'MA20', value: Number(item.ma20).toFixed(4) })
    if (item.hs300 != null) rows.push({ label: '沪深300', value: Number(item.hs300).toFixed(2) + '%' })

    const fmtSign = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
    const vc = (v: number) => v >= 0 ? '#ef4444' : '#22c55e'

    const showDiff = predictApplied && predictedNav !== null && !item.isPredicted

    return (
      <div style={{ backgroundColor: '#1a1a25', border: '1px solid #2a2a3a', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', minWidth: '180px' }}>
        <p style={{ color: '#a0a0b0', marginBottom: '6px' }}>{fmtDate(label ?? '')}</p>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: '2px' }}>
            <span style={{ color: '#8080a0' }}>{r.label}</span>
            <span style={{ color: '#e0e0f0', fontWeight: 500 }}>{r.value}</span>
          </div>
        ))}
        {showDiff && (
          <>
            <div style={{ borderTop: '1px solid #2a2a3a', margin: '6px 0 4px' }} />
            <div style={{ color: '#a0a0b0', marginBottom: '4px', fontSize: '11px' }}>
              对比预测 ¥{predictedNav.toFixed(4)}
            </div>
            {item.netValue != null && (() => {
              const absDiff = Number(item.netValue) - predictedNav
              const pctDiff = (absDiff / predictedNav) * 100
              const points = pctDiff * 100 // 百分点转"点"（1%=100点）
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: '2px', alignItems: 'baseline' }}>
                  <span style={{ color: '#8080a0' }}>净值差</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: vc(absDiff), fontWeight: 600 }}>
                      {absDiff >= 0 ? '+' : ''}{absDiff.toFixed(4)}
                      <span style={{ marginLeft: 4, fontWeight: 400, fontSize: '11px' }}>
                        ({fmtSign(pctDiff)})
                      </span>
                    </span>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: vc(absDiff) }}>
                      {absDiff >= 0 ? '↑' : '↓'}{Math.abs(pctDiff).toFixed(2)}个点
                    </div>
                  </div>
                </div>
              )
            })()}
            {item.ma5 != null && (() => {
              const absDiff = Number(item.ma5) - predictedNav
              const pctDiff = (absDiff / predictedNav) * 100
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: '2px' }}>
                  <span style={{ color: '#8080a0' }}>MA5差</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: vc(absDiff) }}>
                      {absDiff >= 0 ? '+' : ''}{absDiff.toFixed(4)}
                    </span>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: vc(absDiff) }}>
                      {absDiff >= 0 ? '↑' : '↓'}{Math.abs(pctDiff).toFixed(2)}个点
                    </div>
                  </div>
                </div>
              )
            })()}
            {item.ma20 != null && (() => {
              const absDiff = Number(item.ma20) - predictedNav
              const pctDiff = (absDiff / predictedNav) * 100
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: '2px' }}>
                  <span style={{ color: '#8080a0' }}>MA20差</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: vc(absDiff) }}>
                      {absDiff >= 0 ? '+' : ''}{absDiff.toFixed(4)}
                    </span>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: vc(absDiff) }}>
                      {absDiff >= 0 ? '↑' : '↓'}{Math.abs(pctDiff).toFixed(2)}个点
                    </div>
                  </div>
                </div>
              )
            })()}
          </>
        )}
        {item.isPredicted && (
          <div style={{ borderTop: '1px solid #2a2a3a', margin: '6px 0 0', color: '#f59e0b', fontSize: '11px', fontWeight: 600 }}>
            ⬥ 预测点
          </div>
        )}
      </div>
    )
  }

  const chartTooltip = <Tooltip content={<NavTooltip />} />

  const valColor = (v: number) => v >= 0 ? '#ef4444' : '#22c55e'
  const fmtSign = (v: number | null) => v === null ? '--' : `${v >= 0 ? '+' : ''}${v}%`

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="header">
        <div className="max-w-container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              <span>返回</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{fundInfo?.name || `基金 ${code}`}</h1>
                <p className="text-xs text-text-muted">{code} · {fundInfo?.type || '--'} · {fundInfo?.company || '--'}</p>
              </div>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <div className="max-w-container mx-auto p-6">
        {/* 区间选择 + 预测器 */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 shrink-0">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} className={`btn-tag ${period === p.key ? 'btn-tag-active' : ''}`}>{p.label}</button>
            ))}
          </div>

          {/* 预测器 */}
          <div className="flex-1 max-w-md">
            <Card className="!p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">预测次日净值</h3>
                {predictApplied ? (
                  <button onClick={clearPrediction} className="text-xs text-text-muted hover:text-white transition-colors">清除</button>
                ) : (
                  <button onClick={applyPrediction} disabled={!latestItem} className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:text-text-muted disabled:cursor-not-allowed">自动填入</button>
                )}
              </div>

              {predictApplied && predictedNav !== null ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#2a2a3a]">
                    <span className="text-xs text-text-muted">预测净值</span>
                    <span className="text-base font-bold" style={{ color: valColor(predictedNav - (latestItem?.netValue ?? 0)) }}>¥{predictedNav.toFixed(4)}</span>
                    <GrowthText value={parseFloat(predictGrowth) || 0} className="text-xs" />
                  </div>
                  {maDiffs && (
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      {maDiffs.vsMA5 !== null && <div><span className="text-text-muted">MA5 </span><span style={{ color: valColor(maDiffs.vsMA5) }}>{fmtSign(maDiffs.vsMA5)}</span></div>}
                      {maDiffs.vsMA10 !== null && <div><span className="text-text-muted">MA10 </span><span style={{ color: valColor(maDiffs.vsMA10) }}>{fmtSign(maDiffs.vsMA10)}</span></div>}
                      {maDiffs.vsMA20 !== null && <div><span className="text-text-muted">MA20 </span><span style={{ color: valColor(maDiffs.vsMA20) }}>{fmtSign(maDiffs.vsMA20)}</span></div>}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[11px] pt-1 border-t border-[#2a2a3a]">
                    {lastPeak && <span className="flex items-center gap-1"><span className="text-text-muted">距波峰</span><span style={{ color: valColor(peakDiff ?? 0) }}>{fmtSign(peakDiff)}</span></span>}
                    {lastTrough && <span className="flex items-center gap-1"><span className="text-text-muted">距波谷</span><span style={{ color: valColor(troughDiff ?? 0) }}>{fmtSign(troughDiff)}</span></span>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted shrink-0">¥{latestItem?.netValue.toFixed(4) ?? '--'}</span>
                  <span className="text-xs text-text-muted">×</span>
                  <div className="flex-1">
                    <input type="number" step="0.01" value={predictGrowth} onChange={e => setPredictGrowth(e.target.value)} placeholder="涨跌幅%"
                      className="w-full px-2 py-1 bg-bg-secondary border border-[#2a2a3a] rounded text-white text-xs focus:outline-none focus:border-[#3a3a4a]" />
                  </div>
                  <span className="text-xs text-text-muted">=</span>
                  <span className="text-xs font-bold min-w-[56px] text-right" style={{ color: predictedNav ? valColor(predictedNav - (latestItem?.netValue ?? 0)) : '#606070' }}>
                    {predictedNav?.toFixed(4) ?? '¥----'}
                  </span>
                  <button onClick={confirmPrediction} disabled={predictedNav === null}
                    className="px-2 py-1 text-xs font-medium rounded bg-gradient-to-r from-red-500 to-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed">
                    补一天
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {loading ? (
          <FullScreenLoading text="加载净值数据..." />
        ) : history.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-bg-card border border-[#2a2a3a] flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">暂无净值数据</h2>
            <p className="text-text-secondary text-sm">基金 {code} 在该区间内没有净值记录</p>
          </div>
        ) : (
          <>
            {/* 净值走势 */}
            <Card className="!p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">净值走势</h2>
                  <p className="text-sm text-text-secondary">
                    {stats?.startDate && stats?.endDate && (
                      <>{stats.startDate.slice(0, 4)}-{stats.startDate.slice(4, 6)}-{stats.startDate.slice(6, 8)} ~ {stats.endDate.slice(0, 4)}-{stats.endDate.slice(4, 6)}-{stats.endDate.slice(6, 8)}</>
                    )}
                  </p>
                </div>
                {stats && <GrowthText value={stats.periodChange} className="text-2xl font-bold" />}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs">
                {SERIES.map(s => {
                  const isOn = visible[s.key]
                  const color = s.key === 'netValue' ? trendColor : s.color
                  const isDashed = s.key === 'hs300'
                  return (
                    <button key={s.key} onClick={() => toggleSeries(s.key)} className={`flex items-center gap-1.5 transition-opacity ${isOn ? 'opacity-100' : 'opacity-30 line-through'}`}>
                      {isDashed ? <span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: color }} /> : <span className="inline-block w-4 h-0.5 rounded" style={{ background: color }} />}
                      <span className={isOn ? 'text-text-secondary' : 'text-text-muted'}>{s.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="h-[240px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="date" tickFormatter={(v) => { const val = String(v ?? ''); if (!val || val.length !== 8) return ''; return val.slice(4, 6) + '/' + val.slice(6, 8) }} stroke="#4a4a5a" fontSize={11} tickLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="nav" dataKey="netValue" domain={['auto', 'auto']} tickFormatter={(v) => Number(v).toFixed(4)} stroke="#4a4a5a" fontSize={11} tickLine={false} width={70} />
                    <YAxis yAxisId="index" orientation="right" tickFormatter={(v) => Number(v).toFixed(1) + '%'} stroke="#60a5fa" fontSize={10} tickLine={false} width={55} domain={['auto', 'auto']} />
                    {chartTooltip}
                    {stats && <ReferenceLine yAxisId="nav" y={stats.avgNav} stroke="#4a4a5a" strokeDasharray="4 4" />}
                    <Line yAxisId="nav" type="monotone" dataKey="netValue" stroke={trendColor} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: trendColor }} hide={!visible.netValue} />
                    <Line yAxisId="nav" type="monotone" dataKey="ma5" stroke="#f59e0b" strokeWidth={1} dot={false} activeDot={false} connectNulls={false} hide={!visible.ma5} />
                    <Line yAxisId="nav" type="monotone" dataKey="ma10" stroke="#3b82f6" strokeWidth={1} dot={false} activeDot={false} connectNulls={false} hide={!visible.ma10} />
                    <Line yAxisId="nav" type="monotone" dataKey="ma20" stroke="#8b5cf6" strokeWidth={1} dot={false} activeDot={false} connectNulls={false} hide={!visible.ma20} />
                    <Line yAxisId="index" type="monotone" dataKey="hs300" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="6 3" dot={false} activeDot={{ r: 3, fill: '#60a5fa' }} connectNulls={false} hide={!visible.hs300} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 日涨跌幅柱状图 */}
            <Card className="!p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white">日涨跌幅</h2>
                <span className="text-xs text-text-muted">红涨绿跌</span>
              </div>
              <div className="h-[140px] sm:h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="date" tickFormatter={(v) => { const val = String(v ?? ''); if (!val || val.length !== 8) return ''; return val.slice(4, 6) + '/' + val.slice(6, 8) }} stroke="#4a4a5a" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tickFormatter={(v) => Number(v).toFixed(1) + '%'} stroke="#4a4a5a" fontSize={10} tickLine={false} width={45} />
                    <Tooltip labelFormatter={(l) => { const val = String(l ?? ''); if (!val || val.length !== 8) return val; return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}` }}
                      formatter={(value) => [Number(value).toFixed(2) + '%', '涨跌幅']}
                      contentStyle={{ backgroundColor: '#1a1a25', border: '1px solid #2a2a3a', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#a0a0b0' }} />
                    <ReferenceLine y={0} stroke="#4a4a5a" />
                    <Bar dataKey="dayGrowth" fill="#ef4444" radius={[2, 2, 0, 0]}
                      shape={(props) => {
                        const { x, y, width, height, payload } = props as unknown as { x: number; y: number; width: number; height: number; payload: { dayGrowth: number } }
                        const fill = payload.dayGrowth >= 0 ? '#ef4444' : '#22c55e'
                        const barY = height < 0 ? y + height : y
                        return <rect x={x} y={barY} width={width} height={Math.abs(height)} fill={fill} rx={1.5} />
                      }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 统计指标 */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Card className="!p-4"><p className="text-xs text-text-secondary mb-1">最新净值</p><p className="text-xl font-bold text-white">¥{stats.latestNav.toFixed(4)}</p></Card>
                <Card className="!p-4"><p className="text-xs text-text-secondary mb-1">区间涨跌</p><GrowthText value={stats.periodChange} className="text-xl font-bold" /></Card>
                {stats.hs300Change !== null && <Card className="!p-4"><p className="text-xs text-text-secondary mb-1">沪深300同期</p><GrowthText value={stats.hs300Change} className="text-xl font-bold" /></Card>}
                {stats.excessReturn !== null && <Card className="!p-4"><p className="text-xs text-text-secondary mb-1">超额收益</p><GrowthText value={stats.excessReturn} className="text-xl font-bold" /></Card>}
                <Card className="!p-4"><p className="text-xs text-text-secondary mb-1">区间最高</p><p className="text-xl font-bold text-white">¥{stats.maxNav.toFixed(4)}</p></Card>
                <Card className="!p-4"><p className="text-xs text-text-secondary mb-1">区间最低</p><p className="text-xl font-bold text-white">¥{stats.minNav.toFixed(4)}</p></Card>
              </div>
            )}

            {/* 净值明细 */}
            <Card className="!p-0 overflow-hidden">
              <div className="p-4 border-b border-[#2a2a3a]"><h2 className="text-lg font-bold text-white">净值明细</h2></div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">日期</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">单位净值</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">累计收益</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">日涨跌</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((item) => (
                      <tr key={item.date} className="border-t border-[#2a2a3a] hover:bg-bg-hover">
                        <td className="px-4 py-2.5 text-sm text-text-secondary">{item.date.length === 8 ? `${item.date.slice(0, 4)}-${item.date.slice(4, 6)}-${item.date.slice(6, 8)}` : item.date}</td>
                        <td className="px-4 py-2.5 text-sm text-white text-right font-medium">{item.netValue.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-sm text-right"><GrowthText value={item.cumulativeGrowth} /></td>
                        <td className="px-4 py-2.5 text-sm text-right"><GrowthText value={item.dayGrowth} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>

      <footer className="border-t border-[#2a2a3a] py-4 text-center mt-8">
        <p className="text-xs text-text-muted">数据来源：天天基金 · 仅供参考，不构成投资建议</p>
      </footer>
    </div>
  )
}

export default function FundPage() {
  return (
    <Suspense fallback={<FullScreenLoading text="加载中..." />}>
      <FundChartContent />
    </Suspense>
  )
}
