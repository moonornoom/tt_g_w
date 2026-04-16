'use client'

import { Modal, ModalFooter, Button } from '@/components/ui'
import { FundSearchResult, WatchGroup } from '@/lib/types'

interface AddToGroupModalProps {
  isOpen: boolean
  onClose: () => void
  fund: FundSearchResult | null
  watchGroups: WatchGroup[]
  onAddToGroup: (groupId: string) => void
}

export function AddToGroupModal({ isOpen, onClose, fund, watchGroups, onAddToGroup }: AddToGroupModalProps) {
  if (!fund) return null

  const handleAdd = (groupId: string) => {
    onAddToGroup(groupId)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="添加到观察组" width="w-full max-w-md">
      <div className="mb-4 rounded-lg border border-[#2a2a3a] bg-bg-secondary/80 px-3 py-2.5">
        <p className="text-xs text-text-muted mb-0.5">将加入以下基金</p>
        <p className="text-sm font-medium text-white">{fund.name}</p>
        <p className="text-xs text-text-muted font-mono mt-1">{fund.code}</p>
      </div>

      {watchGroups.length === 0 ? (
        <p className="text-center text-text-muted py-6 text-sm">暂无观察组，请先在首页创建观察组</p>
      ) : (
        <>
          <p className="text-xs text-text-muted mb-2">点击下方观察组即可加入（已包含该基金时会置灰）</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
            {watchGroups.map((group) => {
              const isAlreadyIn = group.funds.some((f) => f.code === fund.code)
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => !isAlreadyIn && handleAdd(group.id)}
                  disabled={isAlreadyIn}
                  className={[
                    'group w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#16161f]',
                    isAlreadyIn
                      ? 'cursor-not-allowed border-[#2a2a3a]/60 bg-bg-tertiary/50 text-text-muted opacity-80'
                      : 'cursor-pointer border-[#2a2a3a] bg-bg-secondary text-text-primary hover:border-red-500/45 hover:bg-red-500/5 hover:shadow-[0_0_0_1px_rgba(239,68,68,0.12)] active:scale-[0.99]',
                  ].join(' ')}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      isAlreadyIn ? 'bg-bg-tertiary text-text-muted' : 'bg-red-500/15 text-red-400 group-hover:bg-red-500/25'
                    }`}
                  >
                    {isAlreadyIn ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{group.name}</span>
                    <span className="text-xs text-text-muted">{group.funds.length} 只基金</span>
                  </span>
                  {isAlreadyIn ? (
                    <span className="shrink-0 rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-muted">已在此组</span>
                  ) : (
                    <span className="shrink-0 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 group-hover:border-red-500/50 group-hover:bg-red-500/15">
                      点击加入
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
      </ModalFooter>
    </Modal>
  )
}
