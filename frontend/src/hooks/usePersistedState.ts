import { useState, useEffect } from 'react'

/**
 * 持久化状态 Hook - 自动同步到 localStorage
 * @param key - localStorage 的键名
 * @param defaultValue - 默认值
 * @returns [value, setValue] - 类似 useState 的返回值
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    // 服务端渲染时直接返回默认值
    if (typeof window === 'undefined') {
      return defaultValue
    }

    try {
      const saved = localStorage.getItem(key)
      if (saved !== null) {
        return JSON.parse(saved) as T
      }
    } catch (error) {
      console.warn(`Error loading persisted state for key "${key}":`, error)
    }

    return defaultValue
  })

  useEffect(() => {
    // 保存到 localStorage
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`Error saving persisted state for key "${key}":`, error)
    }
  }, [key, value])

  return [value, setValue] as const
}

/**
 * 清除指定 key 的持久化数据
 */
export function clearPersistedState(key: string) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`Error clearing persisted state for key "${key}":`, error)
  }
}

/**
 * 清除所有应用的持久化数据
 */
export function clearAllPersistedState() {
  const appKeys = [
    'scholarflow-left-panel-width',
    'scholarflow-right-panel-width',
    'scholarflow-left-panel-collapsed',
    'scholarflow-right-panel-collapsed',
    'scholarflow-last-project-id',
  ]

  appKeys.forEach(key => clearPersistedState(key))
}
