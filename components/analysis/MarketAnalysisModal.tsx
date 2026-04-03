'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarketAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  portfolio?: Array<{ code: string; name: string; dayGrowth: number }>
}

export function MarketAnalysisModal({ isOpen, onClose, portfolio }: MarketAnalysisModalProps) {
  const [content, setContent] = useState('')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, progress])

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // 开始分析（使用 fetch + SSE 流）
  const startAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    setContent('')
    setProgress(0)
    setCurrentStep('正在创建任务...')
    setIsComplete(false)

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'market-analysis',
          portfolio: portfolio || [],
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '分析失败')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('无法读取响应')

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7)
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (!dataStr || dataStr === 'undefined') continue
            
            try {
              const data = JSON.parse(dataStr)
              
              if (currentEvent === 'progress') {
                setProgress(data.progress)
                setCurrentStep(data.step || '分析中...')
              } else if (currentEvent === 'chunk') {
                setContent(prev => prev + data.chunk)
              } else if (currentEvent === 'done') {
                setIsComplete(true)
                setLoading(false)
                setProgress(100)
                setCurrentStep('分析完成')
              } else if (currentEvent === 'error-msg') {
                throw new Error(data.error || '分析失败')
              }
            } catch (e) {
              if (e instanceof Error && !e.message.includes('JSON')) {
                throw e
              }
            }
          }
        }
      }

      setIsComplete(true)
      setLoading(false)
      
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
      setLoading(false)
    }
  }, [portfolio])

  const handleClose = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
    setContent('')
    setProgress(0)
    setCurrentStep('')
    setError(null)
    setIsComplete(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen && !loading && !content) {
      startAnalysis()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div 
        className="w-[90vw] max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI 市场分析</h3>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>fund-advisor 定量分析引擎</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 进度条 */}
        {loading && (
          <div className="px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                <span className="text-sm text-white">{currentStep}</span>
              </div>
              <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{progress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div 
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                  boxShadow: '0 0 20px rgba(102, 126, 234, 0.5)'
                }}
              />
            </div>
          </div>
        )}

        {/* 完成状态 */}
        {isComplete && (
          <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(34, 197, 94, 0.1)' }}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-green-400">分析完成</span>
            </div>
            <button
              onClick={startAnalysis}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
            >
              🔄 重新分析
            </button>
          </div>
        )}

        {/* 内容区域 */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6">
          {error && (
            <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 font-medium">{error}</span>
              </div>
              <button onClick={startAnalysis} className="text-sm text-red-300 hover:text-red-200 underline">
                点击重试
              </button>
            </div>
          )}

          {!loading && !content && !error && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" 
                   style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)' }}>
                <span className="text-4xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI 智能市场分析</h3>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
                基于 fund-advisor 定量引擎，实时分析大盘行情、资金流向、热点板块
                {portfolio && portfolio.length > 0 && '，并结合您的持仓给出操作建议'}
              </p>
              <button
                onClick={startAnalysis}
                className="px-8 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 hover:shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
                }}
              >
                🚀 开始分析
              </button>
            </div>
          )}

          {content && (
            <div className="analysis-content">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({children}) => (
                    <h2 className="text-lg font-bold text-white mt-6 mb-3 pb-2 border-b border-white/10">
                      {children}
                    </h2>
                  ),
                  p: ({children}) => (
                    <p className="text-base leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {children}
                    </p>
                  ),
                  strong: ({children}) => (
                    <strong className="font-bold text-white">{children}</strong>
                  ),
                  ul: ({children}) => (
                    <ul className="space-y-2 mb-4 ml-4">{children}</ul>
                  ),
                  li: ({children}) => (
                    <li className="flex items-start gap-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                      <span>{children}</span>
                    </li>
                  ),
                  table: ({children}) => (
                    <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({children}) => (
                    <thead style={{ background: 'rgba(255,255,255,0.05)' }}>{children}</thead>
                  ),
                  th: ({children}) => (
                    <th className="px-4 py-2.5 text-left font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {children}
                    </th>
                  ),
                  td: ({children}) => (
                    <td className="px-4 py-2.5" style={{ color: 'rgba(255,255,255,0.85)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      {children}
                    </td>
                  ),
                  hr: () => (
                    <hr className="my-6" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  ),
                  blockquote: ({children}) => (
                    <blockquote className="pl-4 py-2 rounded-lg mt-4" style={{ background: 'rgba(251, 191, 36, 0.1)', borderLeft: '3px solid #fbbf24' }}>
                      <div className="text-yellow-200 text-sm">{children}</div>
                    </blockquote>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
              
              {loading && (
                <span className="inline-block w-3 h-5 ml-1 rounded-sm animate-pulse" 
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
              )}
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            ⚠️ 以上分析仅供参考，不构成投资建议
          </span>
          {loading && (
            <button onClick={handleClose} className="text-xs text-red-400 hover:text-red-300">
              取消分析
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
