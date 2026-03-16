"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  FileText,
  User,
  Calendar,
  BookOpen,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react"

interface CitationDetail {
  chunk_id: string
  document_id: string
  document_title: string
  authors: string[]
  year: number | null
  page_number: number
  content: string
  section_title: string | null
  pdf_url: string
}

interface CitationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chunkId: string | null
  citationNumber: number
}

export function CitationPanel({
  open,
  onOpenChange,
  chunkId,
  citationNumber,
}: CitationPanelProps) {
  const [citation, setCitation] = useState<CitationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPdf, setShowPdf] = useState(false)

  // 获取引用详情
  useEffect(() => {
    if (!open || !chunkId) {
      setCitation(null)
      setShowPdf(false)
      return
    }

    const fetchCitation = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/citations/chunk/${chunkId}`
        )
        if (!response.ok) {
          throw new Error("获取引用详情失败")
        }
        const result = await response.json()
        if (result.data) {
          setCitation(result.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误")
      } finally {
        setLoading(false)
      }
    }

    fetchCitation()
  }, [open, chunkId])

  // 构建 PDF URL（带页码）
  const getPdfUrl = () => {
    if (!citation) return ""
    // 使用 #page=N 参数让浏览器 PDF 查看器跳转到指定页
    return `http://127.0.0.1:8000${citation.pdf_url}#page=${citation.page_number}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-hidden",
        showPdf ? "max-w-6xl" : "max-w-2xl"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-700">
              {citationNumber}
            </span>
            <span>引用来源</span>
          </DialogTitle>
          <DialogDescription>
            查看引用的原文内容和文献信息
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="flex h-64 flex-col items-center justify-center text-red-500">
            <p>{error}</p>
          </div>
        )}

        {citation && !loading && (
          <div className="flex gap-4">
            {/* 引用信息 */}
            <div className={cn(
              "space-y-4 overflow-y-auto p-2",
              showPdf ? "w-1/3" : "w-full"
            )}>
              {/* 文献元信息 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 flex items-center gap-2 font-medium text-slate-800">
                  <BookOpen className="h-4 w-4" />
                  文献信息
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-700">
                      {citation.document_title}
                    </span>
                  </div>
                  
                  {citation.authors.length > 0 && (
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-slate-600">
                        {citation.authors.join(", ")}
                      </span>
                    </div>
                  )}
                  
                  {citation.year && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{citation.year}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500">页码:</span>
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      第 {citation.page_number} 页
                    </span>
                  </div>
                  
                  {citation.section_title && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">章节:</span>
                      <span className="text-slate-600">{citation.section_title}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 原文内容 */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="mb-3 font-medium text-slate-800">原文摘录</h4>
                <blockquote className="border-l-4 border-blue-300 bg-blue-50/50 py-2 pl-4 pr-2 text-sm italic text-slate-700">
                  {citation.content}
                </blockquote>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPdf(!showPdf)}
                >
                  {showPdf ? (
                    <>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      隐藏 PDF
                    </>
                  ) : (
                    <>
                      <Maximize2 className="mr-2 h-4 w-4" />
                      查看 PDF
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(getPdfUrl(), "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  新窗口打开
                </Button>
              </div>
            </div>

            {/* PDF 预览 */}
            {showPdf && (
              <div className="w-2/3 border-l border-slate-200 pl-4">
                <div className="flex h-[60vh] flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      PDF 预览 - 第 {citation.page_number} 页
                    </span>
                  </div>
                  <iframe
                    src={getPdfUrl()}
                    className="flex-1 rounded-lg border border-slate-200"
                    title="PDF Preview"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
