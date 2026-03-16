/**
 * ScholarFlow 类型定义
 */

// ==================== 文献相关 ====================

export interface Document {
  id: string
  title: string
  authors: string[]
  year: number | null
  source: string | null
  abstract: string | null
  file_path: string
  chunk_count: number
  created_at: string
}

export interface DocumentDetail extends Document {
  keywords: string[]
  sections: DocumentSection[]
}

export interface DocumentSection {
  title: string
  page: number
}

export interface Chunk {
  id: string
  document_id: string
  content: string
  page_number: number
  section_title: string | null
  chunk_index: number
}

// ==================== 对话相关 ====================

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  citations?: Citation[]
  created_at: string
}

export interface Citation {
  index: number
  marker: string
  chunk_id: string
  document_id: string
  document_title: string
  authors: string[]
  author_display: string
  year: number | null
  page: number
  section: string | null
  excerpt: string
}

export interface Conversation {
  id: string
  project_id: string | null
  title: string | null
  messages: Message[]
  created_at: string
  updated_at: string
}

export interface ConversationListItem {
  id: string
  project_id: string | null
  title: string | null
  message_count: number
  last_message_preview: string | null
  created_at: string
  updated_at: string
}

// ==================== Agent 相关 ====================

export type AgentType = 'researcher' | 'writer' | 'editor'
export type AgentStatus = 'idle' | 'working' | 'done' | 'error'

export interface AgentState {
  type: AgentType
  status: AgentStatus
  detail?: string
}

// ==================== 写作相关 ====================

export interface Draft {
  id: string
  project_id: string
  content: string
  version: number
  created_at: string
}

export interface OutlineItem {
  level: number
  title: string
  description?: string
  key_sources?: string[]
  children?: OutlineItem[]
}

// ==================== 项目相关 ====================

export interface Project {
  id: string
  title: string
  description: string | null
  document_count: number
  draft_count: number
  created_at: string
  updated_at: string
}

export interface ProjectCreate {
  title: string
  description?: string
}

export interface ProjectDocument {
  id: string
  title: string
  authors: string[]
  year: number | null
  added_at: string
}

// ==================== API 响应 ====================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

// ==================== SSE 事件 ====================

export type SSEEventType = 'start' | 'agent' | 'content' | 'citation' | 'error' | 'done'

export interface SSEEvent {
  event: SSEEventType
  data: Record<string, unknown>
}

// ==================== UI 状态 ====================

export interface AppState {
  // 当前选中的文献 ID 列表
  selectedDocuments: string[]
  // 当前对话 ID
  currentConversationId: string | null
  // 当前项目 ID
  currentProjectId: string | null
  // 是否正在生成中
  isGenerating: boolean
  // Agent 状态
  agentStates: AgentState[]
}

