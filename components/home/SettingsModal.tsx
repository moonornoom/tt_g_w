'use client'

import { Modal, ModalFooter, Button } from '@/components/ui'
import { DataSource } from '@/lib/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  dataSource: DataSource
  onSetDataSource: (source: DataSource) => void
}

export function SettingsModal({ isOpen, onClose, dataSource, onSetDataSource }: SettingsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="设置">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">基金数据源</label>
          <div className="space-y-2">
            <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
              dataSource === 'eastmoney' ? 'bg-red-500/10 border-red-500/30' : 'bg-bg-secondary border-[#2a2a3a]'
            }`}>
              <input type="radio" name="dataSource" value="eastmoney" checked={dataSource === 'eastmoney'} onChange={() => onSetDataSource('eastmoney')} className="sr-only" />
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
              <input type="radio" name="dataSource" value="sina" checked={dataSource === 'sina'} onChange={() => onSetDataSource('sina')} className="sr-only" />
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
        <Button variant="secondary" onClick={onClose}>关闭</Button>
      </ModalFooter>
    </Modal>
  )
}
