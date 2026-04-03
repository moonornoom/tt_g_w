'use client'

import { useState, useCallback, useRef } from 'react'
import { searchFundsAPI, FundSearchResult } from '@/lib/eastmoney-client'

export function useFundSearch() {
  const [funds, setFunds] = useState<FundSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchIdRef = useRef(0)

  // 搜索基金（防抖 + 竞态保护）
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setSearchError(null)

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    if (!query.trim()) {
      setIsSearchMode(false)
      setFunds([])
      setLoading(false)
      return
    }

    setIsSearchMode(true)
    setLoading(true)

    searchTimerRef.current = setTimeout(async () => {
      const requestId = ++searchIdRef.current
      try {
        const results = await searchFundsAPI(query, 100)
        if (requestId === searchIdRef.current) {
          setFunds(results)
        }
      } catch (error) {
        if (requestId === searchIdRef.current) {
          console.error('搜索失败:', error)
          setSearchError('搜索失败，请检查网络后重试')
        }
      } finally {
        if (requestId === searchIdRef.current) {
          setLoading(false)
        }
      }
    }, 500)
  }, [])

  // 清空搜索
  const handleClearSearch = useCallback(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    searchIdRef.current++
    setSearchQuery('')
    setIsSearchMode(false)
    setFunds([])
    setLoading(false)
    setSearchError(null)
  }, [])

  return {
    funds,
    loading,
    searchQuery,
    isSearchMode,
    searchError,
    handleSearch,
    handleClearSearch,
  }
}
