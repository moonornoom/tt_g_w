'use client'

import { useState, useRef, useEffect } from 'react'

interface SortOption {
  value: string
  label: string
}

interface SortSelectProps {
  value: string
  onChange: (value: string) => void
  options: SortOption[]
  className?: string
}

export function SortSelect({ value, onChange, options, className = '' }: SortSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(o => o.value === value) || options[0]

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* 触发器 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-bg-secondary border border-[#2a2a3a] rounded-lg text-sm text-text-primary hover:border-[#3a3a4a] focus:outline-none focus:border-red-500/50 transition-colors flex items-center justify-between"
      >
        <span>{selectedOption?.label}</span>
        <svg 
          className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-[#2a2a3a] rounded-lg shadow-xl z-50 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                option.value === value 
                  ? 'bg-red-500/10 text-red-400' 
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
