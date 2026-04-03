'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getFundQuotesAPI, getDataSource, FundSearchResult, FundQuote, DataSource } from '@/lib/eastmoney-client'
import { 
  Card,
  Button,
  FundTypeBadge,
  GrowthText,
  Loading,
  Modal,
  ModalFooter
} from '@/components/ui'

// 观察组类型
interface WatchGroup {
  id: string
  name: string
  funds: FundSearchResult[]
  createdAt: number
}

// 本地存储键
const STORAGE_KEY = 'fund_watch_groups'

// 刷新间隔 (1分钟)
const REFRESH_INTERVAL = 60 * 1000

export default function AnalyzePage() {
  const router = useRouter()
  const [watchGroups, setWatchGroups] = useState<WatchGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<DataSource>('eastmoney')

  // 从本地存储加载观察组和数据源设置
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const groups: WatchGroup[] = JSON.parse(saved)
        setWatchGroups(groups)
        // 默认选中第一个组
        if (groups.length > 0) {
          setSelectedGroupId(groups[0].id)
        }
      } catch (e) {
        console.error('加载观察组失败:', e)
      }
    }
    
    // 加载数据源设置
    const savedDataSource = getDataSource()
    setDataSource(savedDataSource)
  }, [])

  // 用 ref 存储最新的 watchGroups，避免 refreshGroupFunds 依赖变化
  const watchGroupsRef = useRef(watchGroups)
  watchGroupsRef.current = watchGroups
  
  // 用 ref 存储数据源
  const dataSourceRef = useRef<DataSource>(dataSource)
  dataSourceRef.current = dataSource

  // 刷新组内基金数据
  const refreshGroupFunds = useCallback(async (groupId: string) => {
    const groups = watchGroupsRef.current
    const group = groups.find(g => g.id === groupId)
    if (!group || group.funds.length === 0) return

    setRefreshing(true)
    try {
      const codes = group.funds.map(f => f.code)
      const quotes = await getFundQuotesAPI(codes, dataSourceRef.current || 'eastmoney')
      
      const updatedFunds = group.funds.map(fund => {
        const quote = quotes[fund.code]
        if (quote) {
          return {
            ...fund,
            netValue: parseFloat(quote.dwjz),
            dayGrowth: parseFloat(quote.gszzl),
          }
        }
        return fund
      })

      const updatedGroups = groups.map(g => {
        if (g.id === groupId) {
          return { ...g, funds: updatedFunds }
        }
        return g
      })
      
      setWatchGroups(updatedGroups)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGroups))
      setLastRefresh(new Date())
    } catch (err) {
      console.error('刷新数据失败:', err)
    } finally {
      setRefreshing(false)
    }
  }, []) // 无依赖，使用 ref 获取最新值

  // 自动刷新 - 每30秒
  useEffect(() => {
    if (!selectedGroupId) return

    // 立即刷新一次
    refreshGroupFunds(selectedGroupId)

    // 设置定时刷新
    const interval = setInterval(() => {
      refreshGroupFunds(selectedGroupId)
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [selectedGroupId, refreshGroupFunds])

  // 获取当前选中的组
  const selectedGroup = watchGroups.find(g => g.id === selectedGroupId)

  // 调用 AI 分析
  const handleAnalyze = async () => {
    if (!selectedGroup || selectedGroup.funds.length === 0) return

    // 检查 API Key
    const apiKey = localStorage.getItem('glm_api_key')
    if (!apiKey) {
      setError('请先配置 GLM API Key（点击首页右上角设置按钮）')
      return
    }

    setAnalyzing(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-GLM-API-Key': apiKey,
        },
        body: JSON.stringify({
          type: 'portfolio',
          funds: selectedGroup.funds,
          groupName: selectedGroup.name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '分析失败')
      }

      setAnalysisResult(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析服务暂时不可用')
    } finally {
      setAnalyzing(false)
    }
  }

  // 手动刷新
  const handleRefresh = () => {
    if (selectedGroupId) {
      refreshGroupFunds(selectedGroupId)
    }
  }

  // 计算统计数据
  const stats = selectedGroup ? {
    total: selectedGroup.funds.length,
    rising: selectedGroup.funds.filter(f => f.dayGrowth > 0).length,
    falling: selectedGroup.funds.filter(f => f.dayGrowth < 0).length,
    avgGrowth: selectedGroup.funds.length > 0
      ? selectedGroup.funds.reduce((sum, f) => sum + f.dayGrowth, 0) / selectedGroup.funds.length
      : 0,
  } : null

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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">AI 基金分析</h1>
                <p className="text-xs text-text-muted">智谱 GLM 智能分析</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="text-xs text-text-muted">
                  上次刷新: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? '刷新中...' : '刷新数据'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-container mx-auto p-6">
        {watchGroups.length === 0 ? (
          /* 无观察组 */
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-bg-card border border-[#2a2a3a] flex items-center justify-center">
              <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">暂无观察组</h2>
            <p className="text-text-secondary mb-6">请先在首页创建观察组并添加基金</p>
            <Button onClick={() => router.push('/')}>
              前往首页
            </Button>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* 左侧：组选择 + 基金列表 */}
            <div className="w-80 flex-shrink-0">
              {/* 组选择 */}
              <Card className="!p-4 mb-4">
                <h3 className="text-sm font-medium text-text-secondary mb-3">选择观察组</h3>
                <div className="space-y-2">
                  {watchGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        selectedGroupId === group.id
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-bg-secondary text-text-primary hover:bg-bg-hover border border-transparent'
                      }`}
                    >
                      <span>{group.name}</span>
                      <span className="text-xs text-text-muted">{group.funds.length} 只</span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* 基金列表 */}
              {selectedGroup && (
                <Card className="!p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-text-secondary">{selectedGroup.name}</h3>
                    <span className="text-xs text-text-muted">每分钟自动刷新</span>
                  </div>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {selectedGroup.funds.map(fund => (
                      <div key={fund.code} className="p-3 rounded-lg bg-bg-secondary">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-text-primary truncate flex-1">{fund.name}</span>
                          <GrowthText value={fund.dayGrowth} className="text-sm font-medium ml-2" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>{fund.code}</span>
                          <span>·</span>
                          <span>净值 {fund.netValue.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* 右侧：分析结果 */}
            <div className="flex-1">
              {/* 统计概览 */}
              {stats && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card className="!p-4">
                    <p className="text-xs text-text-secondary mb-1">基金数量</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </Card>
                  <Card className="!p-4">
                    <p className="text-xs text-text-secondary mb-1">今日上涨</p>
                    <p className="text-2xl font-bold text-red-500">{stats.rising}</p>
                  </Card>
                  <Card className="!p-4">
                    <p className="text-xs text-text-secondary mb-1">今日下跌</p>
                    <p className="text-2xl font-bold text-green-500">{stats.falling}</p>
                  </Card>
                  <Card className="!p-4">
                    <p className="text-xs text-text-secondary mb-1">平均日涨跌</p>
                    <GrowthText value={stats.avgGrowth} className="text-2xl font-bold" />
                  </Card>
                </div>
              )}

              {/* 分析按钮 */}
              {selectedGroup && selectedGroup.funds.length > 0 && (
                <div className="mb-6">
                  <Button
                    onClick={handleAnalyze}
                    loading={analyzing}
                    className="w-full py-4 text-lg"
                  >
                    {analyzing ? 'AI 分析中...' : '🤖 开始 AI 分析'}
                  </Button>
                </div>
              )}

              {/* 分析结果 */}
              {error && (
                <Card className="!p-6 mb-6 border-red-500/30 bg-red-500/5">
                  <p className="text-red-400">{error}</p>
                </Card>
              )}

              {analysisResult && (
                <Card className="!p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    AI 分析报告
                  </h3>
                  <div className="prose prose-invert max-w-none">
                    {analysisResult.split('\n').map((paragraph, index) => {
                      // 处理标题
                      if (paragraph.startsWith('## ')) {
                        return (
                          <h2 key={index} className="text-lg font-bold text-white mt-6 mb-3">
                            {paragraph.replace('## ', '')}
                          </h2>
                        )
                      }
                      if (paragraph.startsWith('### ')) {
                        return (
                          <h3 key={index} className="text-base font-bold text-white mt-4 mb-2">
                            {paragraph.replace('### ', '')}
                          </h3>
                        )
                      }
                      // 处理粗体标题行
                      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                        return (
                          <h4 key={index} className="text-sm font-bold text-purple-400 mt-4 mb-2">
                            {paragraph.replace(/\*\*/g, '')}
                          </h4>
                        )
                      }
                      // 处理列表项
                      if (paragraph.startsWith('- ') || paragraph.startsWith('• ')) {
                        return (
                          <li key={index} className="text-text-secondary ml-4 mb-1">
                            {paragraph.replace(/^[-•] /, '')}
                          </li>
                        )
                      }
                      // 处理数字列表
                      if (/^\d+\. /.test(paragraph)) {
                        return (
                          <li key={index} className="text-text-secondary ml-4 mb-1 list-decimal">
                            {paragraph.replace(/^\d+\. /, '')}
                          </li>
                        )
                      }
                      // 空行
                      if (!paragraph.trim()) {
                        return <div key={index} className="h-2" />
                      }
                      // 普通段落
                      return (
                        <p key={index} className="text-text-secondary mb-2 leading-relaxed">
                          {paragraph}
                        </p>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* 空状态提示 */}
              {!analysisResult && !analyzing && !error && selectedGroup && (
                <Card className="!p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">点击上方按钮开始 AI 分析</h3>
                  <p className="text-text-muted text-sm">
                    AI 将基于当前组的基金数据，从配置、风险、收益等角度提供专业分析
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
