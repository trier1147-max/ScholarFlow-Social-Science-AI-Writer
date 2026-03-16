"use client"

import { useState } from "react"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/dialog"
import { toast } from "@/hooks/useToast"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  ChevronRight
} from "lucide-react"
import type { ConversationListItem } from "@/types"

interface ConversationSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onSelectConversation: (conversationId: string) => void
  onNewConversation: () => void
}

export function ConversationSidebar({
  isOpen,
  onToggle,
  onSelectConversation,
  onNewConversation
}: ConversationSidebarProps) {
  const { conversations, currentConversationId, removeConversation } = useAppStore()
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; conversationId: string | null }>({
    open: false,
    conversationId: null
  })

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirm({ open: true, conversationId })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.conversationId) return

    try {
      // 使用统一的 API 客户端，自动处理错误提示
      await api.delete(`/api/chat/${deleteConfirm.conversationId}`)
      
      // 从状态中移除对话
      removeConversation(deleteConfirm.conversationId)
      
      // 如果删除的是当前对话，开始新对话
      if (deleteConfirm.conversationId === currentConversationId) {
        onNewConversation()
      }
      
      // 显示成功提示
      toast.success("对话已删除", "Conversation Deleted")
    } catch (error) {
      // 错误已经由 API 客户端处理，这里只需记录日志
      console.error("Failed to delete conversation:", error)
    } finally {
      setDeleteConfirm({ open: false, conversationId: null })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
  }

  return (
    <div
      className={cn(
        "absolute left-0 top-0 bottom-0 z-10 flex flex-col border-r border-slate-200 bg-white transition-all duration-300",
        isOpen ? "w-64" : "w-0"
      )}
    >
      {isOpen && (
        <>
          {/* 头部 */}
          <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
            <h3 className="text-sm font-semibold text-slate-700">Conversations</h3>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onToggle}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* 新建对话按钮 */}
          <div className="p-3">
            <Button
              onClick={onNewConversation}
              className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
          </div>

          {/* 对话列表 */}
          <div className="flex-1 overflow-y-auto px-2">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={cn(
                      "group relative cursor-pointer rounded-lg px-3 py-2.5 transition-colors",
                      currentConversationId === conv.id
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className={cn(
                        "h-4 w-4 shrink-0 mt-0.5",
                        currentConversationId === conv.id ? "text-blue-600" : "text-slate-400"
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-sm font-medium line-clamp-2 mb-1",
                          currentConversationId === conv.id ? "text-blue-900" : "text-slate-700"
                        )}>
                          {conv.title || "Untitled"}
                        </p>
                        {conv.last_message_preview && (
                          <p className="text-xs text-slate-400 line-clamp-1 mb-1">
                            {conv.last_message_preview}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(conv.updated_at)}</span>
                          <span>•</span>
                          <span>{conv.message_count} msgs</span>
                        </div>
                      </div>
                      
                      {/* 删除按钮 */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => handleDelete(conv.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, conversationId: null })}
        title="Delete Conversation"
        description="确定要删除这个对话吗？此操作无法撤销。"
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
