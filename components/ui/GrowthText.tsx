/**
 * 涨跌幅显示组件 - 遵循中国股市惯例（红涨绿跌）
 */

interface GrowthTextProps {
  value: number
  decimals?: number
  className?: string
  showSign?: boolean
  suffix?: string
}

/**
 * 获取涨跌颜色类名
 */
export function getGrowthColor(value: number): string {
  return value >= 0 ? 'text-red-500' : 'text-green-500'
}

/**
 * 获取涨跌背景色类名
 */
export function getGrowthBg(value: number): string {
  return value >= 0 ? 'bg-red-500/10' : 'bg-green-500/10'
}

/**
 * 格式化涨跌幅
 */
export function formatGrowth(value: number, decimals: number = 2): string {
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${value.toFixed(decimals)}%`
}

/**
 * 涨跌幅文本组件
 */
export function GrowthText({ 
  value, 
  decimals = 2,
  className = '',
  showSign = true,
  suffix = '%'
}: GrowthTextProps) {
  const colorClass = getGrowthColor(value)
  const prefix = showSign && value >= 0 ? '+' : ''
  
  return (
    <span className={`${colorClass} ${className}`}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  )
}

/**
 * 涨跌幅带背景的组件
 */
interface GrowthBadgeProps extends GrowthTextProps {
  showBg?: boolean
}

export function GrowthBadge({ 
  value, 
  decimals = 2,
  className = '',
  showSign = true,
  showBg = true
}: GrowthBadgeProps) {
  const colorClass = getGrowthColor(value)
  const bgClass = showBg ? getGrowthBg(value) : ''
  const prefix = showSign && value >= 0 ? '+' : ''
  
  return (
    <span className={`px-2 py-0.5 rounded ${colorClass} ${bgClass} ${className}`}>
      {prefix}{value.toFixed(decimals)}%
    </span>
  )
}
