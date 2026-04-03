'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getDataSource, setDataSource, formatAmount } from '@/lib/eastmoney-client'
import { DataSource, FundSearchResult } from '@/lib/types'
import { useWatchGroups } from '@/hooks/useWatchGroups'
import { useFundSearch } from '@/hooks/useFundSearch'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { 
  Card, Button, GrowthText, 
  LoadingArea, SearchInput, Modal, ModalFooter, SortSelect 
} from '@/components/ui'
import { WatchGroupSidebar } from '@/components/home/WatchGroupSidebar'
import { FundCard } from '@/components/home/FundCard'
import { FundListItem } from '@/components/home/FundListItem'
import { MarketAnalysisModal } from '@/components/analysis/MarketAnalysisModal'

export default function HomePage() {
  const router = useRouter()
  
  // 观察组管理
  const {
    watchGroups,
    activeGroupId,
    activeGroup,
    setActiveGroupId,
    createGroup,
    deleteGroup,
    addFundToGroup,
    removeFundFromGroup,
    updateGroupFunds,
  } = useWatchGroups()

  // 搜索功能
  const {
    funds: searchResults,
    loading,
    searchQuery,
    isSearchMode,
    searchError,
    handleSearch,
    handleClearSearch,
  } = useFundSearch()

  // 数据源 - 初始化为默认值，客户端加载后再同步 localStorage
  const [dataSource, setDataSourceState] = useState<DataSource>('eastmoney')
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
    setDataSourceState(getDataSource())
  }, [])
  
  const handleUpdateFunds = useCallback((funds: FundSearchResult[]) => {
    if (activeGroupId) {
      updateGroupFunds(activeGroupId, funds)
    }
  }, [activeGroupId, updateGroupFunds])

  const { refreshing, lastRefresh, refresh } = useAutoRefresh({
    groupId: activeGroupId,
    funds: activeGroup?.funds || [],
    dataSource,
    onUpdate: handleUpdateFunds,
    enabled: !isSearchMode,
  })

  // 选择和对比
  const [selectedFunds, setSelectedFunds] = useState<FundSearchResult[]>([])
  const [sortBy, setSortByState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fund_sort_by') || 'default'
    }
    return 'default'
  })
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('fund_view_mode') as 'card' | 'list') || 'card'
    }
    return 'card'
  })
  
  const setSortBy = (value: string) => {
    setSortByState(value)
    localStorage.setItem('fund_sort_by', value)
  }
  
  const setViewModeWithSave = (value: 'card' | 'list') => {
    setViewMode(value)
    localStorage.setItem('fund_view_mode', value)
  }

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false)
  const [fundToAdd, setFundToAdd] = useState<FundSearchResult | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showMarketAnalysis, setShowMarketAnalysis] = useState(false)

  // 计算显示的基金列表
  const displayFunds = isSearchMode ? searchResults : (activeGroup?.funds || [])
  
  // 排序
  const sortedFunds = useMemo(() => {
    return [...displayFunds].sort((a, b) => {
      switch (sortBy) {
        case 'day_desc': return b.dayGrowth - a.dayGrowth
        case 'day_asc': return a.dayGrowth - b.dayGrowth
        case 'net_value_desc': return b.netValue - a.netValue
        default: return 0
      }
    })
  }, [displayFunds, sortBy])

  // 统计数据
  const stats = useMemo(() => ({
    total: displayFunds.length,
    rising: displayFunds.filter(f => f.dayGrowth > 0).length,
    falling: displayFunds.filter(f => f.dayGrowth < 0).length,
  }), [displayFunds])

  const hasGroups = watchGroups.length > 0
  const hasFunds = displayFunds.length > 0

  // 事件处理
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

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return
    createGroup(newGroupName)
    setNewGroupName('')
    setShowGroupModal(false)
  }

  const handleAddToGroup = (groupId: string) => {
    if (!fundToAdd) return
    addFundToGroup(groupId, fundToAdd)
    setShowAddToGroupModal(false)
    setFundToAdd(null)
  }

  const handleSetDataSource = (source: DataSource) => {
    setDataSource(source)
    setDataSourceState(source)
    if (activeGroupId) {
      refresh()
    }
  }

  const isInWatchGroup = (fundCode: string) => 
    watchGroups.some(g => g.funds.some(f => f.code === fundCode))

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
                  <Button variant="ghost" size="sm" onClick={refresh} disabled={refreshing}>
                    {refreshing ? '...' : '刷新'}
                  </Button>
                </div>
              )}
              
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
              
              <Button variant="secondary" onClick={() => setShowMarketAnalysis(true)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="hidden sm:inline">AI 分析</span>
              </Button>
              
              <Button variant="ghost" onClick={() => setShowSettingsModal(true)} title="设置">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-container mx-auto">
        {/* 侧边栏 */}
        {hasGroups && (
          <WatchGroupSidebar
            watchGroups={watchGroups}
            activeGroupId={activeGroupId}
            refreshing={refreshing}
            sortBy={sortBy}
            onActivateGroup={(id) => { setActiveGroupId(id); handleClearSearch(); }}
            onDeleteGroup={deleteGroup}
            onRemoveFund={removeFundFromGroup}
            onRefresh={refresh}
            onSortChange={setSortBy}
          />
        )}

        <main className="flex-1 p-3 md:p-6">
          {/* 搜索框 */}
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
                <button onClick={() => handleSearch(searchQuery)} className="text-xs text-red-400 hover:text-red-300 underline shrink-0">
                  重试
                </button>
              </div>
            )}
          </div>

          {/* 空状态 */}
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

          {!loading && isSearchMode && searchQuery.trim() && searchResults.length === 0 && !searchError && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-bg-card border border-[#2a2a3a] flex items-center justify-center">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">未找到相关基金</h2>
              <p className="text-text-secondary text-sm">没有匹配 <span className="text-white font-medium">&quot;{searchQuery}&quot;</span> 的结果</p>
              <button onClick={handleClearSearch} className="mt-4 text-sm text-text-muted hover:text-white underline">清空搜索</button>
            </div>
          )}

          {/* 统计卡片 */}
          {hasFunds && (
            <>
              <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
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
              </div>

              {/* 视图切换 */}
              <div className="flex items-center justify-end mb-4 gap-2">
                <span className="text-xs text-text-muted mr-2">视图</span>
                <button
                  onClick={() => setViewModeWithSave('card')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-[#2a2a3a] text-white' : 'text-text-muted hover:text-white hover:bg-bg-hover'}`}
                  title="卡片视图"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewModeWithSave('list')}
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

          {/* 卡片视图 */}
          {!loading && hasFunds && viewMode === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedFunds.map((fund) => (
                <FundCard
                  key={fund.code}
                  fund={fund}
                  isSelected={selectedFunds.some(f => f.code === fund.code)}
                  isInWatchGroup={isInWatchGroup(fund.code)}
                  isSearchMode={isSearchMode}
                  searchQuery={searchQuery}
                  onToggleSelect={toggleFundSelection}
                  onAddToGroup={(f) => { setFundToAdd(f); setShowAddToGroupModal(true); }}
                  onRemoveFromGroup={(code) => activeGroupId && removeFundFromGroup(activeGroupId, code)}
                />
              ))}
            </div>
          )}

          {/* 列表视图 - 桌面 */}
          {!loading && hasFunds && viewMode === 'list' && (
            <div className="rounded-xl border border-[#2a2a3a] overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <div className="bg-bg-card min-w-[640px]">
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg-secondary text-xs text-text-muted font-medium border-b border-[#2a2a3a]">
                    <div className="col-span-5">基金名称</div>
                    <div className="col-span-2 text-right">净值</div>
                    <div className="col-span-2 text-right">日涨跌</div>
                    <div className="col-span-3 text-right">操作</div>
                  </div>
                  {sortedFunds.map((fund) => (
                    <FundListItem
                      key={fund.code}
                      fund={fund}
                      isSelected={selectedFunds.some(f => f.code === fund.code)}
                      isInWatchGroup={isInWatchGroup(fund.code)}
                      isSearchMode={isSearchMode}
                      searchQuery={searchQuery}
                      onToggleSelect={toggleFundSelection}
                      onAddToGroup={(f) => { setFundToAdd(f); setShowAddToGroupModal(true); }}
                      onRemoveFromGroup={(code) => activeGroupId && removeFundFromGroup(activeGroupId, code)}
                    />
                  ))}
                </div>
              </div>

              {/* 列表视图 - 移动端 */}
              <div className="md:hidden bg-bg-card divide-y divide-[#2a2a3a]">
                {sortedFunds.map((fund) => (
                  <FundListItem
                    key={fund.code}
                    fund={fund}
                    isSelected={selectedFunds.some(f => f.code === fund.code)}
                    isInWatchGroup={isInWatchGroup(fund.code)}
                    isSearchMode={isSearchMode}
                    searchQuery={searchQuery}
                    isMobile
                    onToggleSelect={toggleFundSelection}
                    onAddToGroup={(f) => { setFundToAdd(f); setShowAddToGroupModal(true); }}
                    onRemoveFromGroup={(code) => activeGroupId && removeFundFromGroup(activeGroupId, code)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 新建观察组 Modal */}
      <Modal isOpen={showGroupModal} onClose={() => { setShowGroupModal(false); setNewGroupName(''); }} title="新建观察组">
        <input
          type="text"
          placeholder="输入组名称..."
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
          className="w-full px-4 py-2 bg-bg-secondary border border-[#2a2a3a] rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-[#3a3a4a] mb-4"
          autoFocus
        />
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowGroupModal(false); setNewGroupName(''); }}>取消</Button>
          <Button onClick={handleCreateGroup}>创建</Button>
        </ModalFooter>
      </Modal>

      {/* 添加到观察组 Modal */}
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
                  onClick={() => !isAlreadyIn && handleAddToGroup(group.id)}
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

      {/* 设置 Modal */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="设置">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">基金数据源</label>
            <div className="space-y-2">
              <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                dataSource === 'eastmoney' ? 'bg-red-500/10 border-red-500/30' : 'bg-bg-secondary border-[#2a2a3a]'
              }`}>
                <input type="radio" name="dataSource" value="eastmoney" checked={dataSource === 'eastmoney'} onChange={() => handleSetDataSource('eastmoney')} className="sr-only" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">天天基金</p>
                  <p className="text-xs text-text-muted mt-1">交易时间实时更新</p>
                </div>
                {dataSource === 'eastmoney' && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
              <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                dataSource === 'sina' ? 'bg-red-500/10 border-red-500/30' : 'bg-bg-secondary border-[#2a2a3a]'
              }`}>
                <input type="radio" name="dataSource" value="sina" checked={dataSource === 'sina'} onChange={() => handleSetDataSource('sina')} className="sr-only" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">新浪财经</p>
                  <p className="text-xs text-text-muted mt-1">非交易时间也有估值</p>
                </div>
                {dataSource === 'sina' && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowSettingsModal(false)}>关闭</Button>
        </ModalFooter>
      </Modal>
      
      {/* AI 市场分析 Modal */}
      <MarketAnalysisModal
        isOpen={showMarketAnalysis}
        onClose={() => setShowMarketAnalysis(false)}
        portfolio={activeGroup?.funds.map(f => ({
          code: f.code,
          name: f.name,
          dayGrowth: f.dayGrowth,
        }))}
      />

      <footer className="border-t border-[#2a2a3a] py-4 text-center">
        <p className="text-xs text-text-muted">数据来源：{isMounted && dataSource === 'sina' ? '新浪财经' : '天天基金'} · 仅供参考</p>
      </footer>
    </div>
  )
}
