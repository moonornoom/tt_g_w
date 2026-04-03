'use client'

import { FundSearchResult } from '@/lib/types'
import { GrowthText } from '@/components/ui'

interface FundListItemProps {
  fund: FundSearchResult
  isSelected: boolean
  isInWatchGroup: boolean
  isSearchMode: boolean
  searchQuery: string
  isMobile?: boolean
  onToggleSelect: (fund: FundSearchResult) => void
  onAddToGroup: (fund: FundSearchResult) => void
  onRemoveFromGroup: (fundCode: string) => void
}

export function FundListItem({
  fund,
  isSelected,
  isInWatchGroup,
  isSearchMode,
  searchQuery,
  isMobile = false,
  onToggleSelect,
  onAddToGroup,
  onRemoveFromGroup,
}: FundListItemProps) {
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

  if (isMobile) {
    return (
      <div className={`px-4 py-3 ${isSelected ? 'bg-purple-500/10' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-medium text-white truncate"><HighlightText text={fund.name} /></span>
            {isInWatchGroup && <span className="text-xs text-amber-500 shrink-0">★</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isSearchMode ? (
              <button
                onClick={() => onAddToGroup(fund)}
                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-bg-secondary transition-colors"
                title="添加到组"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => onRemoveFromGroup(fund.code)}
                className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="从组中移除"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onToggleSelect(fund)}
              className={`p-1.5 rounded-lg transition-colors ${
                isSelected ? 'text-purple-400 bg-purple-500/20' : 'text-text-muted hover:text-white hover:bg-bg-secondary'
              }`}
              title={isSelected ? '取消选择' : '选择'}
            >
              <svg className="w-4 h-4" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted"><HighlightText text={fund.code} /></span>
            <span className="text-xs text-text-secondary bg-bg-secondary px-1.5 py-0.5 rounded">
              {fund.type.split('-')[0]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">¥{fund.netValue.toFixed(4)}</span>
            <GrowthText value={fund.dayGrowth} className="text-sm font-bold" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-[#2a2a3a] hover:bg-bg-hover transition-colors ${isSelected ? 'bg-purple-500/10' : ''}`}>
      <div className="col-span-5 flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          fund.dayGrowth > 0 ? 'bg-red-500/20' : fund.dayGrowth < 0 ? 'bg-green-500/20' : 'bg-bg-secondary'
        }`}>
          {fund.dayGrowth > 0 ? (
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : fund.dayGrowth < 0 ? (
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted"><HighlightText text={fund.code} /></span>
            <span className="text-xs text-text-secondary bg-bg-secondary px-1.5 py-0.5 rounded">
              {fund.type.split('-')[0]}
            </span>
          </div>
        </div>
      </div>
      <div className="col-span-2 text-right">
        <span className="text-sm text-white font-medium">¥{fund.netValue.toFixed(4)}</span>
      </div>
      <div className="col-span-2 text-right">
        <GrowthText value={fund.dayGrowth} className="text-sm font-bold" />
      </div>
      <div className="col-span-3 flex items-center justify-end gap-1">
        {isSearchMode ? (
          <button
            onClick={() => onAddToGroup(fund)}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-bg-secondary transition-colors"
            title="添加到组"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => onRemoveFromGroup(fund.code)}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="从组中移除"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onToggleSelect(fund)}
          className={`p-1.5 rounded-lg transition-colors ${
            isSelected ? 'text-purple-400 bg-purple-500/20' : 'text-text-muted hover:text-white hover:bg-bg-secondary'
          }`}
          title={isSelected ? '取消选择' : '选择'}
        >
          <svg className="w-4 h-4" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
