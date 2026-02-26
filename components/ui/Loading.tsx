interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'w-6 h-6 border-2',
  md: 'w-10 h-10 border-2',
  lg: 'w-16 h-16 border-4',
}

/**
 * 加载中组件
 */
export function Loading({ 
  size = 'md', 
  className = '',
  text
}: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} border-[#2a2a3a] border-t-red-500 rounded-full animate-spin`}
      />
      {text && <p className="mt-3 text-gray-400 text-sm">{text}</p>}
    </div>
  )
}

/**
 * 全屏加载
 */
interface FullScreenLoadingProps {
  text?: string
}

export function FullScreenLoading({ text = '加载中...' }: FullScreenLoadingProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loading text={text} />
    </div>
  )
}

/**
 * 页面内加载区域
 */
interface LoadingAreaProps {
  text?: string
  className?: string
}

export function LoadingArea({ text = '加载中...', className = '' }: LoadingAreaProps) {
  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <Loading text={text} />
    </div>
  )
}
