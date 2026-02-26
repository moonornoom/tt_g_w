import { ReactNode, ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'tag'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  active?: boolean
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium hover:opacity-90',
  secondary: 'bg-[#1a1a25] border border-[#2a2a3a] text-gray-300 hover:bg-[#1e1e2a] hover:border-[#3a3a4a]',
  ghost: 'text-gray-400 hover:text-white hover:bg-[#1a1a25]',
  tag: 'bg-[#16161f] text-gray-400 border border-[#2a2a3a] hover:border-[#3a3a4a]',
}

const activeClasses: Record<ButtonVariant, string> = {
  primary: '',
  secondary: '',
  ghost: '',
  tag: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

/**
 * 按钮组件 - 遵循 UI-RULES.md 规范
 * 
 * @param variant - 按钮类型：primary | secondary | ghost | tag
 * @param size - 按钮大小：sm | md | lg
 * @param active - 是否激活状态（仅对 tag 类型有效）
 * @param loading - 是否加载中
 */
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  active = false,
  loading = false,
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = 'rounded-lg transition-all inline-flex items-center justify-center gap-2'
  const variantClass = variantClasses[variant]
  const activeClass = active ? activeClasses[variant] : ''
  const sizeClass = sizeClasses[size]
  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      className={`${baseClasses} ${variantClass} ${activeClass} ${sizeClass} ${disabledClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
            fill="none"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}

// 图标按钮
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'p-1',
  md: 'p-2',
  lg: 'p-3',
}

export function IconButton({ 
  icon, 
  variant = 'ghost', 
  size = 'md',
  className = '',
  ...props 
}: IconButtonProps) {
  const baseClasses = 'rounded-lg transition-all inline-flex items-center justify-center'
  const variantClass = variant === 'primary' 
    ? 'bg-red-500 text-white hover:bg-red-600'
    : variant === 'secondary'
    ? 'bg-[#1a1a25] text-gray-300 hover:bg-[#1e1e2a]'
    : 'text-gray-400 hover:text-white hover:bg-[#1a1a25]'
  const sizeClass = iconSizeClasses[size]

  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
}
