'use client'

import { useRouter } from 'next/navigation'
import { FundSearchResult } from '@/lib/types'
import { Card, CardHeader, CardFooter, FundTypeBadge, GrowthText, IconButton } from '@/components/ui'
import { formatAmount } from '@/lib/eastmoney-client'

interface FundCardProps {
  fund: FundSearchResult
  isSelected: boolean
  isInWatchGroup: boolean
  isSearchMode: boolean
  searchQuery: string
  onToggleSelect: (fund: FundSearchResult) => void
  onAddToGroup: (fund: FundSearchResult) => void
  onRemoveFromGroup: (fundCode: string) => void
}

export function FundCard({
  fund,
  isSelected,
  isInWatchGroup,
  isSearchMode,
  searchQuery,
  onToggleSelect,
  onAddToGroup,
  onRemoveFromGroup,
}: FundCardProps) {
  const router = useRouter()
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
    <Card selected={isSelected} className="group">
      <CardHeader>
        <FundTypeBadge type={fund.type} />
        <div className="flex items-center gap-1">
          {isInWatchGroup && isSearchMode && <span className="text-xs text-amber-500">★</span>}
          {isSearchMode ? (
            <IconButton
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
              size="sm"
              onClick={() => onAddToGroup(fund)}
            />
          ) : (
            <IconButton
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
              size="sm"
              variant="ghost"
              className="hover:text-red-400!"
              onClick={() => onRemoveFromGroup(fund.code)}
            />
          )}
          <IconButton
            icon={<svg className="w-4 h-4" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
            size="sm"
            variant={isSelected ? 'primary' : 'ghost'}
            disabled={!isSelected && false} // 在父组件控制
            onClick={() => onToggleSelect(fund)}
          />
        </div>
      </CardHeader>
      <h3 className="font-medium text-white mb-1 truncate"><HighlightText text={fund.name} /></h3>
      <p className="text-xs text-text-muted mb-3"><HighlightText text={fund.code} /> · {fund.company}</p>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs text-text-secondary">净值</p>
          <p className="text-xl font-bold text-white">¥{fund.netValue.toFixed(4)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">日涨跌</p>
          <GrowthText value={fund.dayGrowth} className="text-xl font-bold" />
        </div>
      </div>
      <CardFooter>
        <button
          onClick={() => router.push(`/fund/${fund.code}`)}
          className="text-center flex-1 hover:text-white transition-colors cursor-pointer"
        >
          <p className="text-xs text-text-muted mb-1">走势图</p>
          <svg className="w-4 h-4 mx-auto text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </button>
        <div className="text-center flex-1">
          <p className="text-xs text-text-muted mb-1">日涨跌</p>
          <GrowthText value={fund.dayGrowth} className="text-sm font-medium" />
        </div>
        <div className="text-center flex-1">
          <p className="text-xs text-text-muted mb-1">代码</p>
          <p className="text-sm font-medium text-text-secondary">{fund.code.slice(0, 4)}</p>
        </div>
      </CardFooter>
    </Card>
  )
}
