"use client"

import { useState, useRef, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api-client"
import { getApiUrl } from "@/lib/config"
import { cn } from "@/lib/utils"
import { 
  Send, 
  Loader2, 
  User, 
  Bot,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Menu,
  Plus
} from "lucide-react"
import type { Message, Citation, ConversationListItem } from "@/types"
import { MessageContent } from "./MessageContent"
import { CitationPanel } from "@/components/citation/CitationPanel"
import { ConversationSidebar } from "./ConversationSidebar"

export function ChatPane() {
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // 引用面板状态
  const [citationPanelOpen, setCitationPanelOpen] = useState(false)
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null)
  const [selectedCitationNumber, setSelectedCitationNumber] = useState(0)
  
  // 对话侧边栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const { 
    messages, 
    currentConversationId,
    conversations,
    currentProjectId,
    isGenerating, 
    selectedDocumentIds,
    setMessages,
    setCurrentConversationId,
    setConversations,
    addConversation,
    addMessage,
    updateLastMessage,
    updateLastMessageCitations,
    setIsGenerating,
    startNewConversation,
    agentStates
  } = useAppStore()

  // 加载项目对话列表和最新对话历史
  useEffect(() => {
    if (currentProjectId) {
      loadConversationList()
      loadConversationHistory()
    }
  }, [currentProjectId])

  // 加载对话列表
  const loadConversationList = async () => {
    if (!currentProjectId) return
    
    try {
      const result = await api.get<{ data: ConversationListItem[] }>(`/api/chat/project/${currentProjectId}`, false)
      if (result.data) {
        setConversations(result.data)
      }
    } catch (error) {
      console.error("Failed to load conversation list:", error)
    }
  }

  // 加载最新对话历史
  const loadConversationHistory = async () => {
    if (!currentProjectId) return
    
    try {
      const result = await api.get<{ data: { id: string; messages: any[] } }>(`/api/chat/project/${currentProjectId}/latest`, false)
      if (result.data) {
        setCurrentConversationId(result.data.id)
        const loadedMessages: Message[] = result.data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
          created_at: msg.created_at
        }))
        setMessages(loadedMessages)
      }
    } catch (error) {
      console.error("Failed to load conversation history:", error)
    }
  }

  // 切换对话
  const handleSelectConversation = async (conversationId: string) => {
    try {
      const result = await api.get<{ data: { id: string; messages: any[] } }>(`/api/chat/${conversationId}/history`, false)
      if (result.data) {
        setCurrentConversationId(result.data.id)
        const loadedMessages: Message[] = result.data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
          created_at: msg.created_at
        }))
        setMessages(loadedMessages)
        setIsSidebarOpen(false)
      }
    } catch (error) {
      console.error("Failed to load conversation:", error)
    }
  }

  // 新建对话
  const handleNewConversation = () => {
    startNewConversation()
    setIsSidebarOpen(false)
  }
  
  // 处理引用点击
  const handleCitationClick = (citationNumber: number, chunkId: string) => {
    setSelectedCitationNumber(citationNumber)
    setSelectedChunkId(chunkId)
    setCitationPanelOpen(true)
  }

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 自动调整输入框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating) return
    
    if (selectedDocumentIds.length === 0) {
      // 提示用户选择文献
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: "⚠️ 请先在左侧文献库中选择至少一篇文献，我才能基于文献为您回答。",
        created_at: new Date().toISOString()
      })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      created_at: new Date().toISOString()
    }

    addMessage(userMessage)
    setInputValue("")
    setIsGenerating(true)

    // 创建助手消息占位
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString()
    }
    addMessage(assistantMessage)

    try {
      // 调用后端 API (SSE)
      const response = await fetch(getApiUrl("/api/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          document_ids: selectedDocumentIds,
          project_id: currentProjectId,
          conversation_id: currentConversationId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("event:")) {
            // 事件类型行，跳过
            continue
          }
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim()
            if (!data) continue

            try {
              const parsed = JSON.parse(data)
              
              // 处理不同类型的事件
              if (parsed.conversation_id && parsed.message_id) {
                // start 事件 - 保存 conversation_id
                setCurrentConversationId(parsed.conversation_id)
              } else if (parsed.text) {
                // 内容片段
                updateLastMessage(parsed.text)
              } else if (parsed.agent) {
                // Agent 状态更新 - 可以在这里更新 UI 显示
                console.log("Agent:", parsed.agent, parsed.status, parsed.detail)
              } else if (parsed.citations) {
                // 引用信息
                updateLastMessageCitations(parsed.citations as Citation[])
              } else if (parsed.error) {
                // 错误
                updateLastMessage(`\n\n❌ 错误: ${parsed.message || parsed.error}`)
              }
            } catch {
              // 解析失败，忽略
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      updateLastMessage(`\n\n❌ 请求失败: ${error instanceof Error ? error.message : "未知错误"}`)
    } finally {
      setIsGenerating(false)
      // 刷新对话列表（包含新创建的对话）
      loadConversationList()
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-white">
      {/* 对话侧边栏 */}
      <ConversationSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* 顶部工具栏 */}
      <div className="flex h-12 items-center gap-2 border-b border-slate-100 px-4">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title="Toggle conversations"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-2 text-slate-600 hover:text-slate-900"
          onClick={handleNewConversation}
          disabled={isGenerating}
          title="New conversation"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs">New</span>
        </Button>
        {currentConversationId && (
          <div className="ml-auto text-xs text-slate-400">
            {messages.length} messages
          </div>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50">
              <MessageSquare className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="mb-2 text-lg font-bold tracking-wide text-slate-700">START CONVERSATION</h3>
            <p className="max-w-sm text-center text-sm text-slate-500">
              Select a document from the left, then ask a question.
              AI will provide responses based on your selected content.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {/* AI 头像 */}
                {message.role === "assistant" && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200">
                    <Bot className="h-6 w-6 text-slate-600" />
                  </div>
                )}
                
                {/* 消息内容 */}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm",
                    message.role === "user"
                      ? "bg-slate-800 text-white rounded-br-none"
                      : "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                  )}
                >
                {message.role === "assistant" ? (
                                    <MessageContent 
                                      content={message.content}
                                      isGenerating={
                                        isGenerating && 
                                        message.id === messages[messages.length - 1]?.id
                                      }
                                      citations={message.citations}
                                      onCitationClick={handleCitationClick}
                                    />
                                  ) : (
                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>
                  )}
                </div>
                
                {/* 用户头像 */}
                {message.role === "user" && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 border border-slate-300">
                    <User className="h-6 w-6 text-slate-500" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Agent 状态指示器 */}
      {agentStates.length > 0 && (
        <div className="border-t border-slate-100 bg-white px-6 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            {agentStates.map((state) => (
              <span key={state.type}>
                {state.type === "researcher" && "Searching..."}
                {state.type === "writer" && "Writing..."}
                {state.type === "editor" && "Polishing..."}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 未选择文献提示 */}
      {selectedDocumentIds.length === 0 && (
        <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600 border border-slate-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" />
          <span>Please select a document. AI will only answer based on the selected document.</span>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t border-slate-100 bg-white p-6 pt-4">
        <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Prompt input</span>
            <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", isGenerating ? "animate-ping bg-blue-400" : "bg-green-400")}></span>
                  <span className={cn("relative inline-flex h-2 w-2 rounded-full", isGenerating ? "bg-blue-500" : "bg-green-500")}></span>
                </span>
                <span className="text-xs font-medium text-slate-500">
                    {isGenerating ? "AI is generating..." : "AI is ready"}
                </span>
            </div>
        </div>
        
        <div className="relative rounded-xl border border-slate-200 shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200 transition-all">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your question..."
              rows={1}
              className={cn(
                "w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm text-slate-700",
                "placeholder:text-slate-400",
                "focus:outline-none",
                "max-h-32"
              )}
              disabled={isGenerating}
            />
            <div className="absolute bottom-2 right-2">
                <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isGenerating}
                    size="icon"
                    className={cn(
                        "h-8 w-8 rounded-lg transition-all",
                        inputValue.trim() && !isGenerating 
                            ? "bg-slate-800 text-white hover:bg-slate-700" 
                            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    )}
                >
                    {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                    <Send className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
      </div>
      
      {/* 引用详情面板 */}
      <CitationPanel
        open={citationPanelOpen}
        onOpenChange={setCitationPanelOpen}
        chunkId={selectedChunkId}
        citationNumber={selectedCitationNumber}
      />
    </div>
  )
}

