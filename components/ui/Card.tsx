import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  selected?: boolean
  hover?: boolean
  onClick?: () => void
}

/**
 * 卡片组件 - 遵循 UI-RULES.md 规范
 * 
 * @param children - 卡片内容
 * @param className - 额外的样式类
 * @param selected - 是否选中状态
 * @param hover - 是否启用悬停效果
 * @param onClick - 点击事件
 */
export function Card({ 
  children, 
  className = '', 
  selected = false, 
  hover = true,
  onClick 
}: CardProps) {
  const baseClasses = 'p-4 rounded-xl bg-[#16161f] border transition-all'
  const selectedClasses = selected 
    ? 'border-red-500/50 bg-red-500/5' 
    : 'border-[#2a2a3a]'
  const hoverClasses = hover && !selected ? 'hover:border-[#3a3a4a]' : ''
  const cursorClass = onClick ? 'cursor-pointer' : ''

  return (
    <div 
      className={`${baseClasses} ${selectedClasses} ${hoverClasses} ${cursorClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-3 ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`flex items-center justify-between pt-3 border-t border-[#2a2a3a] ${className}`}>
      {children}
    </div>
  )
}
