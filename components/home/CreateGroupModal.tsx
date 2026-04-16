'use client'

import { useState } from 'react'
import { Modal, ModalFooter, Button } from '@/components/ui'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (name: string) => void
}

export function CreateGroupModal({ isOpen, onClose, onCreateGroup }: CreateGroupModalProps) {
  const [name, setName] = useState('')

  const handleCreate = () => {
    if (!name.trim()) return
    onCreateGroup(name)
    setName('')
    onClose()
  }

  const handleClose = () => {
    setName('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="新建观察组">
      <input
        type="text"
        placeholder="输入组名称..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        className="w-full px-4 py-2 bg-bg-secondary border border-[#2a2a3a] rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-[#3a3a4a] mb-4"
        autoFocus
      />
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>取消</Button>
        <Button onClick={handleCreate}>创建</Button>
      </ModalFooter>
    </Modal>
  )
}
