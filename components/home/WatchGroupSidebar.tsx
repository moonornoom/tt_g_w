'use client'

import { WatchGroup } from '@/lib/types'
import { GrowthText, Button, SortSelect } from '@/components/ui'

interface WatchGroupSidebarProps {
  watchGroups: WatchGroup[]
  activeGroupId: string | null
  refreshing: boolean
  sortBy: string
  onActivateGroup: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onRemoveFund: (groupId: string, fundCode: string) => void
  onRefresh: () => void
  onSortChange: (sortBy: string) => void
}

export function WatchGroupSidebar({
  watchGroups,
  activeGroupId,
  refreshing,
  sortBy,
  onActivateGroup,
  onDeleteGroup,
  onRemoveFund,
  onRefresh,
  onSortChange,
}: WatchGroupSidebarProps) {
  return (
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
              onClick={() => onActivateGroup(group.id)}
            >
              <div className="flex items-center gap-2">
                <svg className={`w-4 h-4 transition-transform text-text-secondary ${activeGroupId === group.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm text-text-primary">{group.name}</span>
                <span className="text-xs text-text-muted">({group.funds.length})</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }} className="text-text-muted hover:text-red-400">
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
                        <GrowthText value={fund.dayGrowth} className="text-xs" />
                      </div>
                    </div>
                    <button onClick={() => onRemoveFund(group.id, fund.code)} className="opacity-0 group-hover/fund:opacity-100 text-text-muted hover:text-red-400">
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
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={onRefresh}
          disabled={refreshing || !activeGroupId}
        >
          <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? '刷新中...' : '手动刷新'}
        </Button>
        
        <SortSelect
          value={sortBy}
          onChange={onSortChange}
          options={[
            { value: 'default', label: '默认排序' },
            { value: 'day_desc', label: '日涨跌 ↓ 高到低' },
            { value: 'day_asc', label: '日涨跌 ↑ 低到高' },
            { value: 'net_value_desc', label: '净值 ↓ 高到低' },
          ]}
        />
        
        <div className="p-3 rounded-lg bg-bg-secondary text-xs text-text-muted">
          💡 组内数据每分钟自动刷新
        </div>
      </div>
    </aside>
  )
}
