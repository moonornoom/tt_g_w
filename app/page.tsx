'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getFundQuotesAPI, searchFundsAPI, formatAmount, FundSearchResult, getDataSource, setDataSource } from '@/lib/eastmoney-client'
import { DataSource } from '@/lib/sina-client'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardHeader, 
  CardFooter,
  Button, 
  IconButton,
  FundTypeBadge,
  GrowthText,
  LoadingArea,
  SearchInput,
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

// 生成唯一ID
const generateId = () => Math.random().toString(36).substr(2, 9)

export default function HomePage() {
  const router = useRouter()
  const [funds, setFunds] = useState<FundSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFunds, setSelectedFunds] = useState<FundSearchResult[]>([])
  const [activeType, setActiveType] = useState<string>('全部')
  const [isSearchMode, setIsSearchMode] = useState(false)
  
  // 观察组状态
  const [watchGroups, setWatchGroups] = useState<WatchGroup[]>([])
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false)
  const [fundToAdd, setFundToAdd] = useState<FundSearchResult | null>(null)
  
  // 搜索状态
  const [searchError, setSearchError] = useState<string | null>(null)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchIdRef = useRef(0)

  // 刷新状态
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // 排序状态
  const [sortBy, setSortBy] = useState<string>('default')
  
  // 视图模式：卡片 / 列表
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  
  // 设置状态
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [glmApiKey, setGlmApiKey] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [dataSource, setDataSourceState] = useState<DataSource>('eastmoney')

  // 从本地存储加载观察组
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const groups: WatchGroup[] = JSON.parse(saved)
        setWatchGroups(groups)
        if (groups.length > 0 && groups[0].funds.length > 0) {
          setActiveGroupId(groups[0].id)
        }
      } catch (e) {
        console.error('加载观察组失败:', e)
      }
    }
    
    // 加载 API Key
    const savedApiKey = localStorage.getItem('glm_api_key')
    if (savedApiKey) {
      setGlmApiKey(savedApiKey)
      setApiKeySaved(true)
    }
    
    // 加载数据源设置
    const savedDataSource = getDataSource()
    setDataSourceState(savedDataSource)
  }, [])

  // 保存 API Key
  const saveApiKey = useCallback(() => {
    if (glmApiKey.trim()) {
      localStorage.setItem('glm_api_key', glmApiKey.trim())
      setApiKeySaved(true)
      setShowSettingsModal(false)
    }
  }, [glmApiKey])

  // 删除 API Key
  const clearApiKey = useCallback(() => {
    localStorage.removeItem('glm_api_key')
    setGlmApiKey('')
    setApiKeySaved(false)
  }, [])

  // 保存观察组到本地存储
  const saveGroups = useCallback((groups: WatchGroup[]) => {
    setWatchGroups(groups)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  }, [])

  // 用 ref 存储最新的 watchGroups，避免 refreshGroupFunds 依赖变化
  const watchGroupsRef = useRef(watchGroups)
  watchGroupsRef.current = watchGroups
  
  // 用 ref 存储数据源
  const dataSourceRef = useRef<DataSource>(dataSource)
  dataSourceRef.current = dataSource

  // 刷新观察组内基金数据
  const refreshGroupFunds = useCallback(async (groupId: string) => {
    const groups = watchGroupsRef.current
    const group = groups.find(g => g.id === groupId)
    if (!group || group.funds.length === 0) return

    setRefreshing(true)
    try {
      const codes = group.funds.map(f => f.code)
      // 使用当前设置的数据源
      const quotes = await getFundQuotesAPI(codes, dataSourceRef.current || 'eastmoney')
      
      const updatedFunds = group.funds.map(fund => {
        const quote = quotes[fund.code]
        if (quote) {
          return {
            ...fund,
            net_value: parseFloat(quote.dwjz),
            day_growth: parseFloat(quote.gszzl),
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

  // 保存数据源设置
  const handleSetDataSource = useCallback((source: DataSource) => {
    setDataSource(source)
    setDataSourceState(source)
    // 切换数据源后立即刷新
    if (activeGroupId) {
      refreshGroupFunds(activeGroupId)
    }
  }, [activeGroupId, refreshGroupFunds])

  // 自动刷新逻辑
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    if (activeGroupId && !isSearchMode) {
      refreshGroupFunds(activeGroupId)
      
      refreshIntervalRef.current = setInterval(() => {
        refreshGroupFunds(activeGroupId)
      }, REFRESH_INTERVAL)
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [activeGroupId, isSearchMode, refreshGroupFunds])

  // 搜索基金（防抖 300ms + 竞态保护）
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSearchError(null)

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    if (!query.trim()) {
      setIsSearchMode(false)
      setFunds([])
      setLoading(false)
      return
    }

    setIsSearchMode(true)
    setLoading(true)

    searchTimerRef.current = setTimeout(async () => {
      const requestId = ++searchIdRef.current
      try {
        const results = await searchFundsAPI(query, 100)
        if (requestId === searchIdRef.current) {
          setFunds(results)
        }
      } catch (error) {
        if (requestId === searchIdRef.current) {
          console.error('搜索失败:', error)
          setSearchError('搜索失败，请检查网络后重试')
        }
      } finally {
        if (requestId === searchIdRef.current) {
          setLoading(false)
        }
      }
    }, 500)
  }

  // 清空搜索
  const handleClearSearch = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    searchIdRef.current++
    setSearchQuery('')
    setIsSearchMode(false)
    setFunds([])
    setLoading(false)
    setSearchError(null)
  }

  // 手动刷新
  const handleManualRefresh = () => {
    if (activeGroupId) {
      refreshGroupFunds(activeGroupId)
    }
  }

  // 基金选择
  const toggleFundSelection = (fund: FundSearchResult) => {
    const isSelected = selectedFunds.some(f => f.code === fund.code)
    if (isSelected) {
      setSelectedFunds(selectedFunds.filter(f => f.code !== fund.code))
    } else if (selectedFunds.length < 5) {
      setSelectedFunds([...selectedFunds, fund])
    }
  }

  const startCompare = () => {
    if (selectedFunds.length < 2) {
      alert('请至少选择2只基金进行对比')
      return
    }
    const codes = selectedFunds.map(f => f.code).join(',')
    router.push(`/compare?funds=${codes}`)
  }

  // 创建观察组
  const createGroup = () => {
    if (!newGroupName.trim()) return
    const newGroup: WatchGroup = {
      id: generateId(),
      name: newGroupName.trim(),
      funds: [],
      createdAt: Date.now()
    }
    saveGroups([...watchGroups, newGroup])
    setNewGroupName('')
    setShowGroupModal(false)
    setActiveGroupId(newGroup.id)
  }

  // 删除观察组
  const deleteGroup = (groupId: string) => {
    if (confirm('确定删除该观察组？')) {
      const updated = watchGroups.filter(g => g.id !== groupId)
      saveGroups(updated)
      if (activeGroupId === groupId) {
        setActiveGroupId(updated.length > 0 ? updated[0].id : null)
      }
    }
  }

  // 添加基金到观察组
  const addFundToGroup = (groupId: string) => {
    if (!fundToAdd) return
    const updated = watchGroups.map(g => {
      if (g.id === groupId && !g.funds.some(f => f.code === fundToAdd.code)) {
        return { ...g, funds: [...g.funds, fundToAdd] }
      }
      return g
    })
    saveGroups(updated)
    setShowAddToGroupModal(false)
    setFundToAdd(null)
  }

  // 从观察组移除基金
  const removeFundFromGroup = (groupId: string, fundCode: string) => {
    const updated = watchGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, funds: g.funds.filter(f => f.code !== fundCode) }
      }
      return g
    })
    saveGroups(updated)
  }

  // 获取当前显示的基金列表
  const activeGroup = watchGroups.find(g => g.id === activeGroupId)
  const displayFunds = isSearchMode ? funds : (activeGroup?.funds || [])

  // 获取所有基金类型
  const fundTypes = ['全部', ...new Set(displayFunds.map(f => f.type.split('-')[0]))]
  
  // 根据类型筛选
  const filteredFunds = activeType === '全部' 
    ? displayFunds 
    : displayFunds.filter(f => f.type.startsWith(activeType))

  // 排序后的基金列表
  const sortedFunds = [...filteredFunds].sort((a, b) => {
    switch (sortBy) {
      case 'day_desc': return b.day_growth - a.day_growth
      case 'day_asc': return a.day_growth - b.day_growth
      case 'month_desc': return b.month_growth - a.month_growth
      case 'year_desc': return b.year_growth - a.year_growth
      case 'net_value_desc': return b.net_value - a.net_value
      default: return 0 // 保持原顺序
    }
  })

  // 统计数据
  const stats = {
    total: displayFunds.length,
    rising: displayFunds.filter(f => f.day_growth > 0).length,
    falling: displayFunds.filter(f => f.day_growth < 0).length,
    avgGrowth: displayFunds.length > 0 
      ? (displayFunds.reduce((sum, f) => sum + f.year_growth, 0) / displayFunds.length).toFixed(2)
      : '0.00'
  }

  const hasGroups = watchGroups.length > 0
  const hasFunds = displayFunds.length > 0

  // 高亮搜索词
  const HighlightText = ({ text }: { text: string }) => {
    if (!isSearchMode || !searchQuery.trim()) return <>{text}</>
    const q = searchQuery.trim()
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return <>{text}</>
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-500/25 text-yellow-300 rounded-sm not-italic">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 顶部导航 */}
      <header className="header">
        <div className="max-w-container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">基金观察</h1>
                <p className="text-xs text-text-muted">A股 · 港股 · 公募基金</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!isSearchMode && lastRefresh && hasFunds && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
                  <span>上次刷新: {lastRefresh.toLocaleTimeString()}</span>
                  <Button variant="ghost" size="sm" onClick={handleManualRefresh} disabled={refreshing}>
                    {refreshing ? '...' : '刷新'}
                  </Button>
                </div>
              )}
              
              {/* AI 分析入口 - 暂时隐藏
              {hasGroups && (
                <Button variant="secondary" onClick={() => router.push('/analyze')}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>AI 分析</span>
                </Button>
              )}
              */}
              
              {selectedFunds.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectedFunds.map((fund) => (
                    <div key={fund.code} className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                      <span className="text-sm text-red-400 max-w-[80px] truncate">{fund.name}</span>
                      <button onClick={() => toggleFundSelection(fund)} className="text-red-400 hover:text-red-300">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <Button onClick={startCompare}>对比 ({selectedFunds.length}/5)</Button>
                </div>
              )}
              
              <Button variant="secondary" onClick={() => setShowGroupModal(true)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">新建组</span>
              </Button>
              
              {/* 设置按钮 */}
              <Button 
                variant="ghost" 
                onClick={() => setShowSettingsModal(true)}
                title="设置"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {apiKeySaved && <span className="w-2 h-2 rounded-full bg-green-500 absolute -top-1 -right-1"></span>}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-container mx-auto">
        {hasGroups && (
          <aside className="hidden md:block w-72 min-h-screen border-r border-[#2a2a3a] bg-[#0f0f14] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-text-secondary">观察组</h2>
              <span className="text-xs text-text-muted">{watchGroups.length} 个</span>
            </div>
            
            <div className="space-y-2">
              {watchGroups.map((group) => (
                <div key={group.id}>
                  <div 
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      activeGroupId === group.id 
                        ? 'bg-bg-hover border border-[#3a3a4a]' 
                        : 'bg-bg-card border border-transparent hover:bg-bg-tertiary'
                    }`}
                    onClick={() => { setActiveGroupId(group.id); setIsSearchMode(false); }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className={`w-4 h-4 transition-transform text-text-secondary ${activeGroupId === group.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm text-text-primary">{group.name}</span>
                      <span className="text-xs text-text-muted">({group.funds.length})</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }} className="text-text-muted hover:text-red-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  {activeGroupId === group.id && group.funds.length > 0 && (
                    <div className="mt-1 ml-4 space-y-1">
                      {group.funds.map((fund) => (
                        <div key={fund.code} className="flex items-center justify-between p-2 rounded bg-bg-secondary group/fund">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary truncate">{fund.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-muted">{fund.code}</span>
                              <GrowthText value={fund.day_growth} className="text-xs" />
                            </div>
                          </div>
                          <button onClick={() => removeFundFromGroup(group.id, fund.code)} className="opacity-0 group-hover/fund:opacity-100 text-text-muted hover:text-red-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 space-y-2">
              {/* 手动刷新按钮 */}
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={handleManualRefresh}
                disabled={refreshing || !activeGroupId}
              >
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? '刷新中...' : '手动刷新'}
              </Button>
              
              {/* 排序选择器 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full px-3 py-2 bg-bg-secondary border border-[#2a2a3a] rounded-lg text-text-primary text-sm focus:outline-none focus:border-[#3a3a4a] cursor-pointer"
              >
                <option value="default">默认排序</option>
                <option value="day_desc">日涨跌 ↓ 高到低</option>
                <option value="day_asc">日涨跌 ↑ 低到高</option>
                <option value="month_desc">近一月 ↓ 高到低</option>
                <option value="year_desc">近一年 ↓ 高到低</option>
                <option value="net_value_desc">净值 ↓ 高到低</option>
              </select>
              
              <div className="p-3 rounded-lg bg-bg-secondary text-xs text-text-muted">
                💡 组内数据每分钟自动刷新
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 p-3 md:p-6">
          {/* 移动端观察组标签栏（桌面端使用侧边栏，移动端使用此横向标签栏） */}
          {hasGroups && (
            <div className="md:hidden -mx-3 mb-4 border-b border-[#2a2a3a]">
              <div className="flex overflow-x-auto scrollbar-none px-3 pb-2 gap-2">
                {watchGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => { setActiveGroupId(group.id); setIsSearchMode(false); }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                      activeGroupId === group.id
                        ? 'bg-[#2a2a3a] text-white'
                        : 'text-text-muted'
                    }`}
                  >
                    {group.name} <span className="opacity-60">({group.funds.length})</span>
                  </button>
                ))}
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm text-text-muted border border-dashed border-[#3a3a4a] whitespace-nowrap"
                >
                  + 新建组
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 pb-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="flex-1 px-2 py-1.5 bg-bg-secondary border border-[#2a2a3a] rounded-lg text-text-primary text-xs focus:outline-none cursor-pointer"
                >
                  <option value="default">默认排序</option>
                  <option value="day_desc">日涨跌↓ 高到低</option>
                  <option value="day_asc">日涨跌↑ 低到高</option>
                  <option value="month_desc">近一月↓ 高到低</option>
                  <option value="year_desc">近一年↓ 高到低</option>
                  <option value="net_value_desc">净值↓ 高到低</option>
                </select>
                <button
                  onClick={handleManualRefresh}
                  disabled={refreshing || !activeGroupId}
                  className="p-1.5 rounded-lg border border-[#2a2a3a] bg-bg-secondary text-text-muted disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="mb-6">
            <SearchInput
              placeholder="搜索基金名称、代码、拼音..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              loading={loading && isSearchMode}
              onClear={handleClearSearch}
            />
            {searchError && (
              <div className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-400 flex-1">{searchError}</span>
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="text-xs text-red-400 hover:text-red-300 underline shrink-0"
                >
                  重试
                </button>
              </div>
            )}
          </div>

          {!hasGroups && !isSearchMode && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-bg-card border border-[#2a2a3a] flex items-center justify-center">
                <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">开始你的基金观察之旅</h2>
              <p className="text-text-secondary mb-6">创建观察组，添加你关注的基金</p>
              <Button onClick={() => setShowGroupModal(true)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                创建第一个观察组
              </Button>
              <p className="text-text-muted text-sm mt-6">或直接搜索基金添加到观察组</p>
            </div>
          )}

          {hasGroups && !hasFunds && !isSearchMode && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-bg-card border border-[#2a2a3a] flex items-center justify-center">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">观察组是空的</h2>
              <p className="text-text-secondary mb-4">搜索基金并添加到当前观察组</p>
            </div>
          )}

          {/* 搜索无结果 */}
          {!loading && isSearchMode && searchQuery.trim() && funds.length === 0 && !searchError && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-bg-card border border-[#2a2a3a] flex items-center justify-center">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">未找到相关基金</h2>
              <p className="text-text-secondary text-sm">
                没有匹配 <span className="text-white font-medium">"{searchQuery}"</span> 的结果
              </p>
              <p className="text-text-muted text-xs mt-2">尝试换个关键词，支持基金名称、代码、拼音</p>
              <button onClick={handleClearSearch} className="mt-4 text-sm text-text-muted hover:text-white underline">
                清空搜索
              </button>
            </div>
          )}

          {hasFunds && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <Card className="!p-4">
                  <p className="text-xs text-text-secondary mb-1">{isSearchMode ? '搜索结果' : '基金总数'}</p>
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
                  <p className="text-xs text-text-secondary mb-1">平均年收益</p>
                  <GrowthText value={parseFloat(stats.avgGrowth)} className="text-2xl font-bold" />
                </Card>
              </div>

              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {fundTypes.map((type) => (
                  <Button key={type} variant="tag" active={activeType === type} onClick={() => setActiveType(type)}>
                    {type}
                  </Button>
                ))}
              </div>
              
              {/* 视图切换 */}
              <div className="flex items-center justify-end mb-4 gap-2">
                <span className="text-xs text-text-muted mr-2">视图</span>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-[#2a2a3a] text-white' : 'text-text-muted hover:text-white hover:bg-bg-hover'}`}
                  title="卡片视图"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#2a2a3a] text-white' : 'text-text-muted hover:text-white hover:bg-bg-hover'}`}
                  title="列表视图"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {loading && <LoadingArea text="加载中..." />}

          {!loading && hasFunds && viewMode === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedFunds.map((fund) => {
                const isSelected = selectedFunds.some(f => f.code === fund.code)
                const isInWatchGroup = watchGroups.some(g => g.funds.some(f => f.code === fund.code))

                return (
                  <Card key={fund.code} selected={isSelected} className="group">
                    <CardHeader>
                      <FundTypeBadge type={fund.type} />
                      <div className="flex items-center gap-1">
                        {isInWatchGroup && <span className="text-xs text-amber-500">★</span>}
                        <IconButton
                          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                          size="sm"
                          className=""
                          onClick={() => { setFundToAdd(fund); setShowAddToGroupModal(true); }}
                        />
                        <IconButton
                          icon={<svg className="w-4 h-4" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                          size="sm"
                          variant={isSelected ? 'primary' : 'ghost'}
                          disabled={!isSelected && selectedFunds.length >= 5}
                          onClick={() => toggleFundSelection(fund)}
                        />
                      </div>
                    </CardHeader>
                    <h3 className="font-medium text-white mb-1 truncate"><HighlightText text={fund.name} /></h3>
                    <p className="text-xs text-text-muted mb-3"><HighlightText text={fund.code} /> · {fund.company}</p>
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-xs text-text-secondary">净值</p>
                        <p className="text-xl font-bold text-white">¥{fund.net_value.toFixed(4)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-secondary">日涨跌</p>
                        <GrowthText value={fund.day_growth} className="text-xl font-bold" />
                      </div>
                    </div>
                    <CardFooter>
                      <div className="text-center flex-1">
                        <p className="text-xs text-text-muted mb-1">近一月</p>
                        <GrowthText value={fund.month_growth} className="text-sm font-medium" />
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-xs text-text-muted mb-1">近一年</p>
                        <GrowthText value={fund.year_growth} className="text-sm font-medium" />
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-xs text-text-muted mb-1">规模</p>
                        <p className="text-sm font-medium text-text-secondary">{formatAmount(fund.total_assets)}</p>
                      </div>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
          
          {/* 列表视图 */}
          {!loading && hasFunds && viewMode === 'list' && (
            <div className="rounded-xl border border-[#2a2a3a] overflow-hidden">
              {/* 桌面端完整表格 */}
              <div className="hidden md:block overflow-x-auto">
                <div className="bg-bg-card min-w-[640px]">
                {/* 表头 */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg-secondary text-xs text-text-muted font-medium border-b border-[#2a2a3a]">
                  <div className="col-span-4">基金名称</div>
                  <div className="col-span-1 text-right">净值</div>
                  <div className="col-span-1 text-right">日涨跌</div>
                  <div className="col-span-1 text-right">近一月</div>
                  <div className="col-span-1 text-right">近一年</div>
                  <div className="col-span-2">类型</div>
                  <div className="col-span-1 text-right">规模</div>
                  <div className="col-span-1 text-center">操作</div>
                </div>

                {/* 列表内容 */}
                {sortedFunds.map((fund) => {
                  const isSelected = selectedFunds.some(f => f.code === fund.code)
                  const isInWatchGroup = watchGroups.some(g => g.funds.some(f => f.code === fund.code))

                  return (
                    <div
                      key={fund.code}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-[#2a2a3a] hover:bg-bg-hover transition-colors ${isSelected ? 'bg-purple-500/10' : ''}`}
                    >
                      {/* 基金名称 */}
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        {/* 涨跌图标 */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          fund.day_growth > 0 ? 'bg-red-500/20' : fund.day_growth < 0 ? 'bg-green-500/20' : 'bg-bg-secondary'
                        }`}>
                          {fund.day_growth > 0 ? (
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                          ) : fund.day_growth < 0 ? (
                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate"><HighlightText text={fund.name} /></span>
                            {isInWatchGroup && <span className="text-xs text-amber-500 flex-shrink-0">★</span>}
                          </div>
                          <span className="text-xs text-text-muted"><HighlightText text={fund.code} /></span>
                        </div>
                      </div>

                      {/* 净值 */}
                      <div className="col-span-1 text-right">
                        <span className="text-sm text-white font-medium">{fund.net_value.toFixed(4)}</span>
                      </div>

                      {/* 日涨跌 */}
                      <div className="col-span-1 text-right">
                        <GrowthText value={fund.day_growth} className="text-sm font-bold" />
                      </div>

                      {/* 近一月 */}
                      <div className="col-span-1 text-right">
                        <GrowthText value={fund.month_growth} className="text-sm" />
                      </div>

                      {/* 近一年 */}
                      <div className="col-span-1 text-right">
                        <GrowthText value={fund.year_growth} className="text-sm" />
                      </div>

                      {/* 类型 */}
                      <div className="col-span-2">
                        <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded">
                          {fund.type.split('-')[0]}
                        </span>
                      </div>

                      {/* 规模 */}
                      <div className="col-span-1 text-right">
                        <span className="text-sm text-text-secondary">{formatAmount(fund.total_assets)}</span>
                      </div>

                      {/* 操作 */}
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setFundToAdd(fund); setShowAddToGroupModal(true); }}
                          className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-bg-secondary transition-colors"
                          title="添加到组"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleFundSelection(fund)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isSelected ? 'text-purple-400 bg-purple-500/20' : 'text-text-muted hover:text-white hover:bg-bg-secondary'
                          }`}
                          title={isSelected ? '取消选择' : '选择'}
                          disabled={!isSelected && selectedFunds.length >= 5}
                        >
                          <svg className="w-4 h-4" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>

              {/* 移动端紧凑列表 */}
              <div className="md:hidden bg-bg-card divide-y divide-[#2a2a3a]">
                {sortedFunds.map((fund) => {
                  const isSelected = selectedFunds.some(f => f.code === fund.code)
                  const isInWatchGroup = watchGroups.some(g => g.funds.some(f => f.code === fund.code))

                  return (
                    <div
                      key={fund.code}
                      className={`px-4 py-3 ${isSelected ? 'bg-purple-500/10' : ''}`}
                    >
                      {/* 第一行：基金名 + 操作按钮 */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-medium text-white truncate"><HighlightText text={fund.name} /></span>
                          {isInWatchGroup && <span className="text-xs text-amber-500 shrink-0">★</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setFundToAdd(fund); setShowAddToGroupModal(true); }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-bg-secondary transition-colors"
                            title="添加到组"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleFundSelection(fund)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelected ? 'text-purple-400 bg-purple-500/20' : 'text-text-muted hover:text-white hover:bg-bg-secondary'
                            }`}
                            title={isSelected ? '取消选择' : '选择'}
                            disabled={!isSelected && selectedFunds.length >= 5}
                          >
                            <svg className="w-4 h-4" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* 第二行：代码+类型 + 净值+日涨跌 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted"><HighlightText text={fund.code} /></span>
                          <span className="text-xs text-text-secondary bg-bg-secondary px-1.5 py-0.5 rounded">
                            {fund.type.split('-')[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-muted">¥{fund.net_value.toFixed(4)}</span>
                          <GrowthText value={fund.day_growth} className="text-sm font-bold" />
                        </div>
                      </div>

                      {/* 第三行：近一月 + 近一年 */}
                      <div className="flex items-center justify-end gap-4 mt-1">
                        <span className="text-xs text-text-muted">近一月 <GrowthText value={fund.month_growth} className="text-xs" /></span>
                        <span className="text-xs text-text-muted">近一年 <GrowthText value={fund.year_growth} className="text-xs" /></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      <Modal isOpen={showGroupModal} onClose={() => { setShowGroupModal(false); setNewGroupName(''); }} title="新建观察组">
        <input
          type="text"
          placeholder="输入组名称..."
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createGroup()}
          className="w-full px-4 py-2 bg-bg-secondary border border-[#2a2a3a] rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-[#3a3a4a] mb-4"
          autoFocus
        />
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowGroupModal(false); setNewGroupName(''); }}>取消</Button>
          <Button onClick={createGroup}>创建</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={showAddToGroupModal && fundToAdd !== null} onClose={() => { setShowAddToGroupModal(false); setFundToAdd(null); }} title="添加到观察组">
        <p className="text-sm text-text-secondary mb-4">{fundToAdd?.name}</p>
        {watchGroups.length === 0 ? (
          <p className="text-center text-text-muted py-4">暂无观察组，请先创建</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {watchGroups.map((group) => {
              const isAlreadyIn = fundToAdd ? group.funds.some(f => f.code === fundToAdd.code) : false
              return (
                <button
                  key={group.id}
                  onClick={() => !isAlreadyIn && addFundToGroup(group.id)}
                  disabled={isAlreadyIn}
                  className={`w-full flex items-center justify-between p-3 rounded-lg ${
                    isAlreadyIn ? 'bg-bg-tertiary text-text-muted cursor-not-allowed' : 'bg-bg-secondary text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  <span>{group.name}</span>
                  {isAlreadyIn && <span className="text-xs">已添加</span>}
                </button>
              )
            })}
          </div>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowAddToGroupModal(false); setFundToAdd(null); }}>关闭</Button>
        </ModalFooter>
      </Modal>

      {/* 设置模态框 */}
      <Modal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        title="设置"
      >
        <div className="space-y-6">
          {/* 数据源配置 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              基金数据源
            </label>
            <div className="space-y-2">
              <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                dataSource === 'eastmoney' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-bg-secondary border-[#2a2a3a] hover:border-[#3a3a4a]'
              }`}>
                <input
                  type="radio"
                  name="dataSource"
                  value="eastmoney"
                  checked={dataSource === 'eastmoney'}
                  onChange={() => handleSetDataSource('eastmoney')}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">天天基金 (东方财富)</p>
                  <p className="text-xs text-text-muted mt-1">交易时间9:30-15:00实时更新，非交易时间显示上一交易日数据</p>
                </div>
                {dataSource === 'eastmoney' && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
              
              <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                dataSource === 'sina' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-bg-secondary border-[#2a2a3a] hover:border-[#3a3a4a]'
              }`}>
                <input
                  type="radio"
                  name="dataSource"
                  value="sina"
                  checked={dataSource === 'sina'}
                  onChange={() => handleSetDataSource('sina')}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">新浪财经</p>
                  <p className="text-xs text-text-muted mt-1">数据更新更及时，非交易时间也有估值</p>
                </div>
                {dataSource === 'sina' && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            </div>
          </div>
          
          {/* 分割线 */}
          <div className="border-t border-[#2a2a3a]"></div>
          
          {/* GLM API Key 配置 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              智谱AI API Key (用于AI分析)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="输入你的 GLM API Key..."
                value={glmApiKey}
                onChange={(e) => setGlmApiKey(e.target.value)}
                className="flex-1 px-4 py-2 bg-bg-secondary border border-[#2a2a3a] rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-[#3a3a4a]"
              />
              {apiKeySaved && (
                <Button variant="ghost" onClick={clearApiKey} title="清除">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              )}
            </div>
            {apiKeySaved && (
              <p className="mt-2 text-xs text-green-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                API Key 已配置
              </p>
            )}
            <p className="mt-2 text-xs text-text-muted">
              获取方式：<a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">https://open.bigmodel.cn/</a>
            </p>
          </div>
        </div>
        
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowSettingsModal(false)}>关闭</Button>
        </ModalFooter>
      </Modal>

      <footer className="border-t border-[#2a2a3a] py-4 text-center">
        <p className="text-xs text-text-muted">数据来源：{dataSource === 'sina' ? '新浪财经' : '天天基金'} · 仅供参考，不构成投资建议</p>
      </footer>
    </div>
  )
}
