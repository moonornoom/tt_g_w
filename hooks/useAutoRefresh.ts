'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getFundQuotesAPI, FundSearchResult } from '@/lib/eastmoney-client'
import { DataSource } from '@/lib/types'

const REFRESH_INTERVAL = 60 * 1000 // 1分钟

interface UseAutoRefreshOptions {
  groupId: string | null
  funds: FundSearchResult[]
  dataSource: DataSource
  onUpdate: (funds: FundSearchResult[]) => void
  enabled?: boolean
}

export function useAutoRefresh({
  groupId,
  funds,
  dataSource,
  onUpdate,
  enabled = true,
}: UseAutoRefreshOptions) {
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fundsRef = useRef(funds)
  fundsRef.current = funds

  // 刷新数据
  const refresh = useCallback(async () => {
    if (!groupId || fundsRef.current.length === 0) return

    setRefreshing(true)
    try {
      const codes = fundsRef.current.map(f => f.code)
      const quotes = await getFundQuotesAPI(codes, dataSource)
      
      const updatedFunds = fundsRef.current.map(fund => {
        const quote = quotes[fund.code]
        if (quote) {
          return {
            ...fund,
            netValue: parseFloat(quote.dwjz),
            dayGrowth: parseFloat(quote.gszzl),
          }
        }
        return fund
      })
      
      onUpdate(updatedFunds)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('刷新数据失败:', err)
    } finally {
      setRefreshing(false)
    }
  }, [groupId, dataSource, onUpdate])

  // 自动刷新逻辑
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    if (groupId && enabled && funds.length > 0) {
      refresh()
      
      refreshIntervalRef.current = setInterval(() => {
        refresh()
      }, REFRESH_INTERVAL)
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [groupId, enabled, funds.length, refresh])

  return {
    refreshing,
    lastRefresh,
    refresh,
  }
}
