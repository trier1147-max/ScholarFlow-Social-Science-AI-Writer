"use client"

import { useState, useMemo, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { 
  Copy, 
  Check,
  FileDown,
  Wand2,
  Loader2,
  Cloud,
  CloudOff,
  RefreshCw,
  Search
} from "lucide-react"
import { TiptapEditor } from "./TiptapEditor"
import { useAutosave, formatLastSaved } from "@/hooks/useAutosave"
import { toast } from "@/hooks/useToast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export function EditorPane() {
  const [isCopied, setIsCopied] = useState(false)
  const [isPolishing, setIsPolishing] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const [showTraceDialog, setShowTraceDialog] = useState(false)
  const [traceResult, setTraceResult] = useState<{ hasIssues: boolean; markers: string[] }>({ hasIssues: false, markers: [] })
  const { editorContent, setEditorContent, currentProjectId } = useAppStore()
  
  // 自动保存 hook
  const { status: saveStatus, lastSaved, save } = useAutosave({
    draftId,
    content: editorContent,
    projectId: currentProjectId,
    debounceMs: 2000,
  })
  
  // 加载或创建草稿（根据项目）
  useEffect(() => {
    const loadOrCreateDraft = async () => {
      setIsLoadingDraft(true)
      try {
        // 构建 URL，传入项目 ID
        const url = currentProjectId
          ? `/api/drafts/latest?project_id=${currentProjectId}`
          : "/api/drafts/latest"
        const result = await api.get<{ data: any }>(url, false)
        if (result.data) {
          setDraftId(result.data.id)
          if (result.data.content !== editorContent) {
            setEditorContent(result.data.content || "")
          }
        }
      } catch (error) {
        console.error("Failed to load draft:", error)
        // 如果加载失败，创建一个新的本地 ID
        setDraftId(`local-${Date.now()}`)
      } finally {
        setIsLoadingDraft(false)
      }
    }
    
    loadOrCreateDraft()
  }, [currentProjectId])

  // 复制内容（去除HTML标签）
  const handleCopy = async () => {
    // 从 HTML 中提取纯文本
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = editorContent
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    
    await navigator.clipboard.writeText(textContent)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // 导出 HTML
  const handleExportHTML = () => {
    const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ScholarFlow 文稿</title>
  <style>
    body {
      font-family: 'Source Serif 4', 'Noto Serif SC', Georgia, serif;
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
      line-height: 1.75;
      color: #334155;
    }
    h1, h2, h3 { color: #1e293b; }
    blockquote {
      border-left: 4px solid #e2e8f0;
      padding-left: 1rem;
      font-style: italic;
      color: #64748b;
    }
    mark { background-color: #fef08a; }
    a { color: #2563eb; }
  </style>
</head>
<body>
${editorContent}
</body>
</html>`
    const blob = new Blob([fullHTML], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "draft.html"
    a.click()
    URL.revokeObjectURL(url)
  }

  // AI 润色
  const handlePolish = async () => {
    if (!editorContent.trim() || isPolishing) return
    
    // 从 HTML 中提取纯文本用于润色
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = editorContent
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    
    if (!textContent.trim()) return
    
    // 文本太短不需要润色
    if (textContent.length < 50) {
      toast.warning("文本太短，无需润色（至少50字）", "Text Too Short")
      return
    }
    
    setIsPolishing(true)
    
    try {
      const result = await api.post<{ data?: { content?: string; ai_markers?: string[] } }>(
        "/api/polish",
        {
          content: textContent,
          lite_mode: textContent.length < 500, // 短文本使用快速模式
        },
        true
      )
      if (result.data?.content) {
        // 将润色后的文本转换为 HTML
        // 处理段落和换行
        const polishedHTML = result.data.content
          .split(/\n\n+/)
          .filter((p: string) => p.trim())
          .map((p: string) => {
            // 处理段落内的单个换行
            const processed = p.replace(/\n/g, '<br>')
            return `<p>${processed}</p>`
          })
          .join("")
        
        setEditorContent(polishedHTML)
        toast.success("文本已成功润色！", "Polish Complete")
        
        // 如果检测到 AI 痕迹，提示用户
        if (result.data.ai_markers && result.data.ai_markers.length > 0) {
          console.log("AI markers found:", result.data.ai_markers)
        }
      }
    } catch (error) {
      console.error("Polish error:", error)
      toast.error(
        error instanceof Error ? error.message : "请稍后重试",
        "Polish Failed"
      )
    } finally {
      setIsPolishing(false)
    }
  }
  
  // 检查 AI 痕迹
  const handleCheckMarkers = async () => {
    if (!editorContent.trim()) return
    
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = editorContent
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    
    if (!textContent.trim()) return
    
    try {
      const result = await api.post<{ data?: { has_issues?: boolean; markers?: string[] } }>(
        "/api/polish/check-markers",
        { content: textContent },
        false
      )
      setTraceResult({
        hasIssues: result.data?.has_issues || false,
        markers: result.data?.markers || []
      })
      setShowTraceDialog(true)
    } catch (error) {
      console.error("Check markers error:", error)
      toast.error("检查失败，请稍后重试", "Check Failed")
    }
  }

  // 字数统计（从 HTML 中提取纯文本）
  const wordCount = useMemo(() => {
    if (!editorContent.trim()) return 0
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = editorContent
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    return textContent.trim().length
  }, [editorContent])

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
        <div className="flex items-center gap-2">
          <Button 
            className="bg-[#0f766e] text-white hover:bg-[#115e59] h-9 px-4 rounded-lg font-medium shadow-sm transition-all"
            onClick={handlePolish}
            disabled={isPolishing || !editorContent.trim()}
          >
            {isPolishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {isPolishing ? "Polishing..." : "AI Polishing"}
          </Button>
          <Button
            variant="outline"
            className="h-9 px-3 text-slate-600 hover:bg-slate-50 border-slate-200"
            onClick={handleCheckMarkers}
            disabled={!editorContent.trim()}
            title="Check for AI writing traces"
          >
            <Search className="mr-2 h-4 w-4" />
            Trace Check
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 px-3 text-slate-600 hover:bg-slate-50 border-slate-200"
            onClick={handleCopy}
            disabled={!editorContent.trim()}
          >
            {isCopied ? (
              <Check className="mr-2 h-4 w-4 text-green-500" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {isCopied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="outline"
            className="h-9 px-3 text-slate-600 hover:bg-slate-50 border-slate-200"
            onClick={handleExportHTML}
            disabled={!editorContent.trim()}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Tiptap 编辑器 */}
      <div className="flex-1 overflow-hidden bg-white">
        <TiptapEditor
          content={editorContent}
          onChange={setEditorContent}
          placeholder="Start writing or paste content here..."
        />
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-2 text-xs text-slate-400">
        <span>{wordCount} words</span>
        <span className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Cloud className="h-3 w-3 text-green-500" />
              <span>Saved {formatLastSaved(lastSaved)}</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <CloudOff className="h-3 w-3 text-red-500" />
              <span className="text-red-500">Save failed</span>
              <button
                onClick={save}
                className="text-blue-500 hover:underline"
              >
                Retry
              </button>
            </>
          )}
          {saveStatus === "idle" && !isLoadingDraft && (
            <>
              <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
              <span>Ready</span>
            </>
          )}
          {isLoadingDraft && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Loading...</span>
            </>
          )}
        </span>
      </div>

      {/* AI 痕迹检查结果弹窗 */}
      <Dialog open={showTraceDialog} onOpenChange={setShowTraceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {traceResult.hasIssues ? "AI Writing Traces Detected" : "Quality Check Passed"}
            </DialogTitle>
            <DialogDescription>
              {traceResult.hasIssues ? (
                <>
                  发现以下 AI 写作痕迹：
                  {"\n\n"}
                  {traceResult.markers.map((marker, idx) => `${idx + 1}. ${marker}`).join('\n')}
                  {"\n\n"}
                  建议使用"AI 润色"功能优化文本。
                </>
              ) : (
                "未发现明显的 AI 写作痕迹，文本质量良好！"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTraceDialog(false)}
            >
              Close
            </Button>
            {traceResult.hasIssues && (
              <Button
                className="bg-[#0f766e] hover:bg-[#115e59]"
                onClick={() => {
                  setShowTraceDialog(false)
                  handlePolish()
                }}
                disabled={isPolishing}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Polish Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

