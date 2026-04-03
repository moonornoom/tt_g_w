'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { WatchGroup, FundSearchResult } from '@/lib/types'

const STORAGE_KEY = 'fund_watch_groups'
const generateId = () => Math.random().toString(36).substr(2, 9)

export function useWatchGroups() {
  const [watchGroups, setWatchGroups] = useState<WatchGroup[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const watchGroupsRef = useRef(watchGroups)
  watchGroupsRef.current = watchGroups

  // 从本地存储加载
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const groups: WatchGroup[] = JSON.parse(saved)
        // 数据迁移：将旧的 snake_case 字段转换为 camelCase
        const migratedGroups = groups.map(group => ({
          ...group,
          funds: group.funds.map((fund: any) => ({
            code: fund.code,
            name: fund.name,
            type: fund.type,
            company: fund.company,
            netValue: fund.netValue ?? fund.net_value ?? 0,
            dayGrowth: fund.dayGrowth ?? fund.day_growth ?? 0,
          }))
        }))
        setWatchGroups(migratedGroups)
        if (migratedGroups.length > 0 && migratedGroups[0].funds.length > 0) {
          setActiveGroupId(migratedGroups[0].id)
        }
      } catch (e) {
        console.error('加载观察组失败:', e)
      }
    }
  }, [])

  // 保存到本地存储
  const saveGroups = useCallback((groups: WatchGroup[]) => {
    setWatchGroups(groups)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  }, [])

  // 创建观察组
  const createGroup = useCallback((name: string) => {
    if (!name.trim()) return null
    const newGroup: WatchGroup = {
      id: generateId(),
      name: name.trim(),
      funds: [],
      createdAt: Date.now()
    }
    saveGroups([...watchGroupsRef.current, newGroup])
    setActiveGroupId(newGroup.id)
    return newGroup
  }, [saveGroups])

  // 删除观察组
  const deleteGroup = useCallback((groupId: string) => {
    const updated = watchGroupsRef.current.filter(g => g.id !== groupId)
    saveGroups(updated)
    if (activeGroupId === groupId) {
      setActiveGroupId(updated.length > 0 ? updated[0].id : null)
    }
  }, [saveGroups, activeGroupId])

  // 添加基金到观察组
  const addFundToGroup = useCallback((groupId: string, fund: FundSearchResult) => {
    const updated = watchGroupsRef.current.map(g => {
      if (g.id === groupId && !g.funds.some(f => f.code === fund.code)) {
        return { ...g, funds: [...g.funds, fund] }
      }
      return g
    })
    saveGroups(updated)
  }, [saveGroups])

  // 从观察组移除基金
  const removeFundFromGroup = useCallback((groupId: string, fundCode: string) => {
    const updated = watchGroupsRef.current.map(g => {
      if (g.id === groupId) {
        return { ...g, funds: g.funds.filter(f => f.code !== fundCode) }
      }
      return g
    })
    saveGroups(updated)
  }, [saveGroups])

  // 更新观察组内基金数据
  const updateGroupFunds = useCallback((groupId: string, funds: FundSearchResult[]) => {
    const updated = watchGroupsRef.current.map(g => {
      if (g.id === groupId) {
        return { ...g, funds }
      }
      return g
    })
    saveGroups(updated)
  }, [saveGroups])

  // 获取当前活动组
  const activeGroup = watchGroups.find(g => g.id === activeGroupId)

  return {
    watchGroups,
    activeGroupId,
    activeGroup,
    setActiveGroupId,
    createGroup,
    deleteGroup,
    addFundToGroup,
    removeFundFromGroup,
    updateGroupFunds,
    watchGroupsRef,
  }
}
