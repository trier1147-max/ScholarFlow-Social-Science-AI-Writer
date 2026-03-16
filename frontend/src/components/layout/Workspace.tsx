"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/stores/app-store"
import { usePersistedState } from "@/hooks/usePersistedState"
import { LibraryPane } from "@/components/library/LibraryPane"
import { ChatPane } from "@/components/chat/ChatPane"
import { EditorPane } from "@/components/editor/EditorPane"
import { ResizableDivider } from "@/components/ui/resizable-divider"
import { 
  BookOpen, 
  MessageSquare, 
  FileEdit,
  PanelLeftClose,
  PanelRightClose,
  ArrowLeft,
  FolderOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface WorkspaceProps {
  onBackToProjects?: () => void
}

const MIN_PANEL_WIDTH = 250
const MAX_PANEL_WIDTH = 600

export function Workspace({ onBackToProjects }: WorkspaceProps) {
  // 使用持久化状态
  const [leftPanelWidth, setLeftPanelWidth] = usePersistedState('scholarflow-left-panel-width', 320)
  const [rightPanelWidth, setRightPanelWidth] = usePersistedState('scholarflow-right-panel-width', 500)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = usePersistedState('scholarflow-left-panel-collapsed', false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = usePersistedState('scholarflow-right-panel-collapsed', false)
  
  const { currentProjectId, projects } = useAppStore()
  const currentProject = projects.find(p => p.id === currentProjectId)

  // 处理左侧面板宽度调整 - 使用 useCallback 避免重新创建
  const handleLeftResize = useCallback((delta: number) => {
    setLeftPanelWidth(prev => {
      const newWidth = prev + delta
      return Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH)
    })
  }, [])

  // 处理右侧面板宽度调整 - 使用 useCallback 避免重新创建
  const handleRightResize = useCallback((delta: number) => {
    setRightPanelWidth(prev => {
      const newWidth = prev - delta  // 注意右侧是反向的
      return Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH)
    })
  }, [])

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* 顶部：项目信息栏 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToProjects}
            className="gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Projects</span>
          </Button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-blue-100 p-1.5">
              <FolderOpen className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-semibold text-slate-900">
              {currentProject?.title || "Untitled Project"}
            </span>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          {currentProject?.document_count || 0} documents
        </div>
      </header>

      {/* 主体内容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：文献管理 */}
        <div
          className={cn(
            "flex flex-col border-r border-slate-200 bg-slate-50",
            leftPanelCollapsed ? "w-12 transition-all duration-300" : ""
          )}
          style={leftPanelCollapsed ? {} : { width: `${leftPanelWidth}px` }}
        >
          {/* 面板头部 */}
          <div className="flex h-12 items-center justify-between px-4">
            {!leftPanelCollapsed && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Documents</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="h-7 w-7 text-slate-400 hover:text-slate-600"
            >
              <PanelLeftClose className={cn(
                "h-4 w-4 transition-transform",
                leftPanelCollapsed && "rotate-180"
              )} />
            </Button>
          </div>
        
        {/* 面板内容 */}
        {!leftPanelCollapsed && (
          <div className="flex-1 overflow-hidden">
            <LibraryPane />
          </div>
        )}
      </div>

        {/* 可调整大小的分隔线（左侧） */}
        {!leftPanelCollapsed && (
          <ResizableDivider onResize={handleLeftResize} />
        )}

        {/* 中间：AI 对话 */}
        <div className="flex flex-1 flex-col bg-white">
          {/* 面板头部 */}
          <div className="flex h-12 items-center justify-between border-b border-slate-100 px-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">AI Assistant</span>
            </div>
          </div>
          
          {/* 对话区域 */}
          <div className="flex-1 overflow-hidden">
            <ChatPane />
          </div>
        </div>

        {/* 可调整大小的分隔线（右侧） */}
        {!rightPanelCollapsed && (
          <ResizableDivider onResize={handleRightResize} />
        )}

        {/* 右侧：编辑器 */}
        <div
          className={cn(
            "flex flex-col border-l border-slate-200 bg-white",
            rightPanelCollapsed ? "w-12 transition-all duration-300" : ""
          )}
          style={rightPanelCollapsed ? {} : { width: `${rightPanelWidth}px` }}
        >
          {/* 面板头部 */}
          <div className="flex h-12 items-center justify-between px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="h-7 w-7 text-slate-400 hover:text-slate-600"
            >
              <PanelRightClose className={cn(
                "h-4 w-4 transition-transform",
                rightPanelCollapsed && "rotate-180"
              )} />
            </Button>
            {!rightPanelCollapsed && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Writing Editor</span>
              </div>
            )}
          </div>
          
          {/* 编辑器区域 */}
          {!rightPanelCollapsed && (
            <div className="flex-1 overflow-hidden">
              <EditorPane />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

