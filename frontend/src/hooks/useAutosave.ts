"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { api } from "@/lib/api-client"

interface AutosaveState {
  status: "idle" | "saving" | "saved" | "error"
  lastSaved: Date | null
  version: number
}

interface UseAutosaveOptions {
  draftId: string | null
  content: string
  projectId?: string | null
  debounceMs?: number
  onSave?: (version: number) => void
  onError?: (error: Error) => void
}

interface UseAutosaveReturn {
  status: AutosaveState["status"]
  lastSaved: Date | null
  version: number
  save: () => Promise<void>
  isLoading: boolean
}

export function useAutosave({
  draftId,
  content,
  projectId,
  debounceMs = 2000,
  onSave,
  onError,
}: UseAutosaveOptions): UseAutosaveReturn {
  const [state, setState] = useState<AutosaveState>({
    status: "idle",
    lastSaved: null,
    version: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // 保存上次内容，用于检测变化
  const lastContentRef = useRef(content)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // 执行保存
  const save = useCallback(async () => {
    if (!draftId || !content.trim()) return
    
    setIsLoading(true)
    setState((prev) => ({ ...prev, status: "saving" }))

    try {
      const result = await api.post<{ data?: { version?: number } }>(
        `/api/drafts/${draftId}/autosave`,
        { content, project_id: projectId },
        false
      )
      
      if (isMountedRef.current) {
        const newVersion = result.data?.version || state.version + 1
        setState({
          status: "saved",
          lastSaved: new Date(),
          version: newVersion,
        })
        lastContentRef.current = content
        onSave?.(newVersion)
      }
    } catch (error) {
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, status: "error" }))
        onError?.(error instanceof Error ? error : new Error("保存失败"))
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [draftId, content, state.version, onSave, onError])

  // 防抖自动保存
  useEffect(() => {
    // 检测内容是否有变化
    if (content === lastContentRef.current) return
    if (!draftId) return

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 设置新的定时器
    debounceTimerRef.current = setTimeout(() => {
      save()
    }, debounceMs)

    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [content, draftId, debounceMs, save])

  // 组件卸载时保存
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    status: state.status,
    lastSaved: state.lastSaved,
    version: state.version,
    save,
    isLoading,
  }
}

/**
 * 格式化最后保存时间
 */
export function formatLastSaved(date: Date | null): string {
  if (!date) return "尚未保存"
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) {
    return "刚刚保存"
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes} 分钟前保存`
  } else {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " 保存"
  }
}
