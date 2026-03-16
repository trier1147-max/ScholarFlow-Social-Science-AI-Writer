"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { GripVertical } from "lucide-react"

interface ResizableDividerProps {
  onResize: (delta: number) => void
  className?: string
  minSize?: number
  maxSize?: number
}

export function ResizableDivider({ 
  onResize, 
  className 
}: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)
  const pendingDeltaRef = useRef(0)

  // 使用 requestAnimationFrame 优化性能
  const scheduleUpdate = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingDeltaRef.current !== 0) {
          onResize(pendingDeltaRef.current)
          pendingDeltaRef.current = 0
        }
        rafIdRef.current = null
      })
    }
  }, [onResize])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      e.preventDefault()
      const delta = e.clientX - startXRef.current
      startXRef.current = e.clientX
      
      // 累积 delta，由 RAF 统一处理
      pendingDeltaRef.current += delta
      scheduleUpdate()
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      
      // 清理待处理的动画帧
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      pendingDeltaRef.current = 0
    }

    if (isDragging) {
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      document.addEventListener("mousemove", handleMouseMove, { passive: false })
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      
      // 组件卸载时清理
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [isDragging, scheduleUpdate])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startXRef.current = e.clientX
    setIsDragging(true)
  }

  return (
    <div
      className={cn(
        "group relative w-1 shrink-0 cursor-col-resize bg-slate-200 hover:bg-blue-400",
        isDragging && "bg-blue-500",
        className
      )}
      onMouseDown={handleMouseDown}
    >
      {/* 拖拽指示器 */}
      <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center w-3 pointer-events-none">
        <GripVertical 
          className={cn(
            "h-6 w-6 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
            isDragging && "opacity-100 text-blue-600"
          )} 
        />
      </div>
      
      {/* 扩大可拖拽区域 */}
      <div className="absolute inset-y-0 -left-2 -right-2" />
    </div>
  )
}
