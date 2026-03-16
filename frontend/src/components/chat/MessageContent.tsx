"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { Citation } from "@/types"

interface MessageContentProps {
  content: string
  isGenerating?: boolean
  citations?: Citation[]
  onCitationClick?: (citationNumber: number, chunkId: string) => void
}

/**
 * 渲染消息内容，将 [^n] 转换为上标引用标记
 */
export function MessageContent({ 
  content, 
  isGenerating,
  citations,
  onCitationClick 
}: MessageContentProps) {
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null)

  // 根据引用编号获取 chunk_id
  const getChunkId = (citationNum: number): string | undefined => {
    const citation = citations?.find(c => c.index === citationNum)
    return citation?.chunk_id
  }

  // 处理引用点击
  const handleCitationClick = (citationNum: number) => {
    const chunkId = getChunkId(citationNum)
    if (chunkId && onCitationClick) {
      onCitationClick(citationNum, chunkId)
    }
  }

  // 解析内容，将 [^n] 转换为 React 元素
  const renderContent = () => {
    // 匹配 [^1], [^2], [^12] 等格式
    const citationRegex = /\[\^(\d+)\]/g
    const parts: ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = citationRegex.exec(content)) !== null) {
      // 添加引用前的文本
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }

      // 添加引用标记
      const citationNum = parseInt(match[1], 10)
      const chunkId = getChunkId(citationNum)
      
      parts.push(
        <CitationMark
          key={`citation-${match.index}`}
          number={citationNum}
          isHovered={hoveredCitation === citationNum}
          onHover={setHoveredCitation}
          onClick={() => handleCitationClick(citationNum)}
          hasDetail={!!chunkId}
        />
      )

      lastIndex = match.index + match[0].length
    }

    // 添加剩余文本
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex))
    }

    return parts
  }

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {renderContent()}
      {isGenerating && (
        <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-slate-400" />
      )}
    </div>
  )
}

interface CitationMarkProps {
  number: number
  isHovered: boolean
  onHover: (num: number | null) => void
  onClick: () => void
  hasDetail: boolean
}

/**
 * 引用标记组件 - 显示为上标数字
 */
function CitationMark({ number, isHovered, onHover, onClick, hasDetail }: CitationMarkProps) {
  return (
    <sup
      className={cn(
        "inline-flex items-center justify-center",
        "mx-0.5 min-w-[1.25rem] px-1 py-0.5",
        "text-[10px] font-medium",
        "rounded-sm transition-colors",
        hasDetail ? "cursor-pointer" : "cursor-help",
        isHovered
          ? "bg-blue-500 text-white"
          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
      )}
      onMouseEnter={() => onHover(number)}
      onMouseLeave={() => onHover(null)}
      onClick={hasDetail ? onClick : undefined}
      title={hasDetail ? `来源 ${number} - 点击查看原文` : `来源 ${number}`}
    >
      {number}
    </sup>
  )
}
