import { ReactNode, useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  width?: string
}

/**
 * 模态框组件 - 遵循 UI-RULES.md 规范
 */
export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  width = 'w-96'
}: ModalProps) {
  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={onClose}
    >
      <div 
        className={`bg-[#16161f] rounded-xl border border-[#2a2a3a] p-6 ${width}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="text-lg font-medium text-white mb-4">{title}</h3>
        )}
        {children}
      </div>
    </div>
  )
}

interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`flex justify-end gap-2 mt-4 ${className}`}>
      {children}
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}

/**
 * 确认弹窗
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消'
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-gray-400 mb-4">{message}</p>
      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-[#1a1a25] text-gray-400 hover:bg-[#1e1e2a]"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
        >
          {confirmText}
        </button>
      </ModalFooter>
    </Modal>
  )
}
