'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getFundRankingAPI } from '@/lib/eastmoney-client'
import { FundRankingItem, RankingSortColumn, FundSearchResult, WatchGroup } from '@/lib/types'
import { GrowthText, Button, FundTypeBadge } from '@/components/ui'
import { useWatchGroups } from '@/hooks/useWatchGroups'
import { AddToGroupModal } from '@/components/home/AddToGroupModal'

function rankingToFundSearch(f: FundRankingItem): FundSearchResult {
  return {
    code: f.code,
    name: f.name,
    type: f.fundType,
    company: '其他',
    netValue: f.netValue,
    dayGrowth: f.dailyGrowth,
  }
}

/** 一键默认目标：优先「非当前」观察组；仅一组时只能加入该组 */
function pickDefaultNonCurrentGroup(groups: WatchGroup[], currentId: string | null): WatchGroup | null {
  if (groups.length === 0) return null
  if (currentId) {
    const other = groups.find((g) => g.id !== currentId)
    return other ?? groups[0]
  }
  return groups.length > 1 ? groups[1] : groups[0]
}

const SORT_OPTIONS: { value: RankingSortColumn; label: string }[] = [
  { value: 'SYL_JN', label: '今年以来' },
  { value: 'SYL_Y', label: '近一月' },
  { value: 'SYL_3Y', label: '近三月' },
  { value: 'SYL_6Y', label: '近六月' },
  { value: 'SYL_1N', label: '近一年' },
  { value: 'SYL_LN', label: '成立以来' },
]

const FUND_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: '全部' },
  { value: '1', label: '股票型' },
  { value: '2', label: '混合型' },
  { value: '3', label: '债券型' },
  { value: '5', label: '指数型' },
  { value: '7', label: 'QDII' },
  { value: '14', label: 'FOF' },
]

const PAGE_SIZE = 40

function getRankStyle(rank: number) {
  if (rank === 1) return 'bg-gradient-to-r from-amber-500/20 to-transparent text-amber-400 font-bold'
  if (rank === 2) return 'bg-gradient-to-r from-slate-400/15 to-transparent text-slate-300 font-bold'
  if (rank === 3) return 'bg-gradient-to-r from-orange-600/15 to-transparent text-orange-400 font-bold'
  return ''
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = ['', 'from-amber-500 to-yellow-400', 'from-slate-400 to-slate-300', 'from-orange-600 to-orange-400']
    return (
      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${colors[rank]} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
        {rank}
      </div>
    )
  }
  return (
    <div className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted text-xs">
      {rank}
    </div>
  )
}

function ReturnCell({ value, highlight }: { value: number; highlight?: boolean }) {
  return (
    <td className={`px-3 py-3 text-right tabular-nums ${highlight ? 'font-semibold' : ''}`}>
      <GrowthText value={value} decimals={2} />
    </td>
  )
}

export default function RankingPage() {
  const router = useRouter()
  const { watchGroups, activeGroupId, addFundToGroup } = useWatchGroups()
  const [funds, setFunds] = useState<FundRankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<RankingSortColumn>('SYL_JN')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [fundType, setFundType] = useState('0')
  const [showAddModal, setShowAddModal] = useState(false)
  const [fundToAdd, setFundToAdd] = useState<FundSearchResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  /** 首页当前选中组（用于文案说明） */
  const quickGroup = useMemo(
    () => pickDefaultNonCurrentGroup(watchGroups, activeGroupId),
    [watchGroups, activeGroupId]
  )

  const quickTargetIsNonCurrent = useMemo(() => {
    if (!quickGroup || !activeGroupId) return activeGroupId === null && watchGroups.length > 1
    return quickGroup.id !== activeGroupId
  }, [quickGroup, activeGroupId, watchGroups.length])

  const isInQuickGroup = useCallback(
    (code: string) => quickGroup?.funds.some((f) => f.code === code) ?? false,
    [quickGroup]
  )

  const fetchRanking = useCallback(async () => {
    setLoading(true)
    const result = await getFundRankingAPI({
      page,
      pageSize: PAGE_SIZE,
      sort: sortColumn,
      order: sortOrder,
      fundType,
    })
    setFunds(result.funds)
    setTotal(result.total)
    setLoading(false)
  }, [page, sortColumn, sortOrder, fundType])

  useEffect(() => {
    fetchRanking()
  }, [fetchRanking])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleSortChange = (col: RankingSortColumn) => {
    if (col === sortColumn) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setSortColumn(col)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleFundTypeChange = (type: string) => {
    setFundType(type)
    setPage(1)
  }

  const openAddModal = (fund: FundRankingItem) => {
    setFundToAdd(rankingToFundSearch(fund))
    setShowAddModal(true)
  }

  const handleAddToGroup = (groupId: string) => {
    if (fundToAdd) addFundToGroup(groupId, fundToAdd)
  }

  const handleQuickAddDefault = (fund: FundRankingItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!quickGroup) return
    addFundToGroup(quickGroup.id, rankingToFundSearch(fund))
    setToast(`已加入「${quickGroup.name}」`)
  }

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortColumn)?.label || '今年以来'

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="header">
        <div className="max-w-container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="w-10 h-10 rounded-lg bg-bg-tertiary border border-[#2a2a3a] flex items-center justify-center text-text-secondary hover:text-white hover:border-[#3a3a4a] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">基金收益排行榜</h1>
                <p className="text-xs text-text-muted">
                  共 {total.toLocaleString()} 只基金 · 按{sortLabel}{sortOrder === 'desc' ? '降序' : '升序'}
                  {quickGroup && (
                    <span className="text-text-secondary">
                      {' · '}
                      默认加入「{quickGroup.name}」
                      {quickTargetIsNonCurrent ? '（非当前观察组）' : watchGroups.length <= 1 ? '（唯一观察组）' : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <a
              href="https://github.com/LeekHub/leek-fund"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-[#2a2a3a] text-text-secondary hover:text-white hover:border-[#3a3a4a] transition-colors text-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span className="hidden sm:inline">韭菜盒子</span>
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-container mx-auto px-4 md:px-6 py-4">
        {/* Filters */}
        <div className="mb-4 space-y-3">
          {/* Fund type tabs */}
          <div className="flex flex-wrap gap-2">
            {FUND_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleFundTypeChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  fundType === opt.value
                    ? 'btn-tag-active'
                    : 'btn-tag hover:border-[#3a3a4a]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort period tabs */}
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                  sortColumn === opt.value
                    ? 'btn-tag-active'
                    : 'btn-tag hover:border-[#3a3a4a]'
                }`}
              >
                {opt.label}
                {sortColumn === opt.value && (
                  <svg className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin-slow" />
              <span className="text-text-secondary">加载排行榜数据...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[#2a2a3a] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px]">
                  <thead>
                    <tr className="bg-bg-secondary text-xs text-text-muted border-b border-[#2a2a3a]">
                      <th className="px-3 py-3 text-left w-12">排名</th>
                      <th className="px-3 py-3 text-left">基金代码</th>
                      <th className="px-3 py-3 text-left min-w-[200px]">基金名称</th>
                      <th className="px-3 py-3 text-right">单位净值</th>
                      <th className="px-3 py-3 text-right">累计净值</th>
                      <th className="px-3 py-3 text-right cursor-pointer select-none hover:text-white"
                        onClick={() => handleSortChange('SYL_Y')}>
                        <SortHeader label="近一月" active={sortColumn === 'SYL_Y'} order={sortOrder} />
                      </th>
                      <th className="px-3 py-3 text-right cursor-pointer select-none hover:text-white"
                        onClick={() => handleSortChange('SYL_3Y')}>
                        <SortHeader label="近三月" active={sortColumn === 'SYL_3Y'} order={sortOrder} />
                      </th>
                      <th className="px-3 py-3 text-right cursor-pointer select-none hover:text-white"
                        onClick={() => handleSortChange('SYL_6Y')}>
                        <SortHeader label="近六月" active={sortColumn === 'SYL_6Y'} order={sortOrder} />
                      </th>
                      <th className="px-3 py-3 text-right cursor-pointer select-none hover:text-white"
                        onClick={() => handleSortChange('SYL_JN')}>
                        <SortHeader label="今年以来" active={sortColumn === 'SYL_JN'} order={sortOrder} />
                      </th>
                      <th className="px-3 py-3 text-right cursor-pointer select-none hover:text-white"
                        onClick={() => handleSortChange('SYL_1N')}>
                        <SortHeader label="近一年" active={sortColumn === 'SYL_1N'} order={sortOrder} />
                      </th>
                      <th className="px-3 py-3 text-right cursor-pointer select-none hover:text-white"
                        onClick={() => handleSortChange('SYL_LN')}>
                        <SortHeader label="成立以来" active={sortColumn === 'SYL_LN'} order={sortOrder} />
                      </th>
                      <th className="px-2 py-3 text-right w-[148px] whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a3a]">
                    {funds.map((fund, index) => {
                      const rank = (page - 1) * PAGE_SIZE + index + 1
                      return (
                        <tr
                          key={fund.code}
                          onClick={() => router.push(`/fund/${fund.code}`)}
                          className={`bg-bg-card hover:bg-bg-hover cursor-pointer transition-colors ${getRankStyle(rank)}`}
                        >
                          <td className="px-3 py-3">
                            <RankBadge rank={rank} />
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-text-muted text-sm font-mono">{fund.code}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white font-medium truncate max-w-[180px]">{fund.name}</span>
                              <FundTypeBadge type={fund.fundType} />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-white tabular-nums">
                            {fund.netValue.toFixed(4)}
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-text-secondary tabular-nums">
                            {fund.totalNetValue.toFixed(4)}
                          </td>
                          <ReturnCell value={fund.monthReturn} highlight={sortColumn === 'SYL_Y'} />
                          <ReturnCell value={fund.threeMonthReturn} highlight={sortColumn === 'SYL_3Y'} />
                          <ReturnCell value={fund.sixMonthReturn} highlight={sortColumn === 'SYL_6Y'} />
                          <ReturnCell value={fund.ytdReturn} highlight={sortColumn === 'SYL_JN'} />
                          <ReturnCell value={fund.yearReturn} highlight={sortColumn === 'SYL_1N'} />
                          <ReturnCell value={fund.sinceInception} highlight={sortColumn === 'SYL_LN'} />
                          <td
                            className="px-2 py-2 text-right align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {quickGroup && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  title={
                                    quickTargetIsNonCurrent
                                      ? `一键加入非当前观察组「${quickGroup.name}」`
                                      : `一键加入「${quickGroup.name}」`
                                  }
                                  disabled={isInQuickGroup(fund.code)}
                                  onClick={(e) => handleQuickAddDefault(fund, e)}
                                  className="!px-2 !py-1 text-xs whitespace-nowrap"
                                >
                                  {isInQuickGroup(fund.code) ? '已在该组' : '默认加入'}
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openAddModal(fund)
                                }}
                                className="!px-2 !py-1 text-xs whitespace-nowrap"
                              >
                                选择组
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <span className="text-xs text-text-muted">
                  第 {page} / {totalPages} 页
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg text-sm btn-tag disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    首页
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg text-sm btn-tag disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  {generatePageNumbers(page, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-text-muted text-sm">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
                          page === p ? 'btn-tag-active' : 'btn-tag'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm btn-tag disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm btn-tag disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    末页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AddToGroupModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setFundToAdd(null)
        }}
        fund={fundToAdd}
        watchGroups={watchGroups}
        onAddToGroup={handleAddToGroup}
      />

      {toast && (
        <div
          className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 px-4 py-2.5 rounded-xl border border-red-500/25 bg-bg-card text-sm text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}

      <footer className="border-t border-[#2a2a3a] py-4 text-center mt-8">
        <p className="text-xs text-text-muted">
          数据来源：天天基金（东方财富） · 排行榜 API 参考
          <a href="https://github.com/LeekHub/leek-fund" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-white ml-1 underline underline-offset-2">
            韭菜盒子 (LeekFund)
          </a>
          {' '}· 仅供参考，不构成投资建议
        </p>
      </footer>
    </div>
  )
}

function SortHeader({ label, active, order }: { label: string; active: boolean; order: 'asc' | 'desc' }) {
  return (
    <span className={`inline-flex items-center gap-1 justify-end ${active ? 'text-red-400' : ''}`}>
      {label}
      {active && (
        <svg className={`w-3 h-3 transition-transform ${order === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </span>
  )
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | string)[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}
