import { ReactNode } from 'react'

export type BadgeVariant = 
  | 'default' 
  | 'stock'      // 股票型 - 红色
  | 'mixed'      // 混合型 - 琥珀色
  | 'bond'       // 债券型 - 翠绿色
  | 'index'      // 指数型 - 蓝色
  | 'qdii'       // QDII - 紫色
  | 'money'      // 货币型 - 青色
  | 'up'         // 上涨 - 红色
  | 'down'       // 下跌 - 绿色

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'text-gray-400 bg-gray-500/10',
  stock: 'text-red-400 bg-red-500/10',
  mixed: 'text-amber-400 bg-amber-500/10',
  bond: 'text-emerald-400 bg-emerald-500/10',
  index: 'text-blue-400 bg-blue-500/10',
  qdii: 'text-purple-400 bg-purple-500/10',
  money: 'text-cyan-400 bg-cyan-500/10',
  up: 'text-red-400 bg-red-500/10',
  down: 'text-green-400 bg-green-500/10',
}

/**
 * 徽章/标签组件 - 遵循 UI-RULES.md 规范
 * 
 * @param variant - 徽章类型
 * @param children - 徽章内容
 */
export function Badge({ 
  children, 
  variant = 'default',
  className = '' 
}: BadgeProps) {
  const baseClasses = 'px-2 py-0.5 rounded text-xs font-medium inline-flex items-center'
  const variantClass = variantClasses[variant]

  return (
    <span className={`${baseClasses} ${variantClass} ${className}`}>
      {children}
    </span>
  )
}

/**
 * 根据基金类型返回对应的 Badge variant
 */
export function getFundTypeVariant(type: string): BadgeVariant {
  const baseType = type.split('-')[0]
  const typeMap: Record<string, BadgeVariant> = {
    '股票型': 'stock',
    '混合型': 'mixed',
    '债券型': 'bond',
    '指数型': 'index',
    'QDII': 'qdii',
    '货币型': 'money',
    'ETF': 'index',
    'LOF': 'mixed',
  }
  return typeMap[baseType] || 'default'
}

/**
 * 基金类型徽章
 */
interface FundTypeBadgeProps {
  type: string
  className?: string
}

export function FundTypeBadge({ type, className = '' }: FundTypeBadgeProps) {
  const variant = getFundTypeVariant(type)
  const displayType = type.split('-')[0]
  
  return (
    <Badge variant={variant} className={className}>
      {displayType}
    </Badge>
  )
}
