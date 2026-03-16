import { create } from 'zustand'
import type { Document, Message, AgentState, Citation, Project, ConversationListItem } from '@/types'

interface AppStore {
  // ==================== 项目状态 ====================
  projects: Project[]
  currentProjectId: string | null
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  setCurrentProject: (id: string | null) => void
  updateProject: (id: string, updates: Partial<Project>) => void

  // ==================== 文献状态 ====================
  documents: Document[]
  selectedDocumentIds: string[]
  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  removeDocument: (id: string) => void
  toggleDocumentSelection: (id: string) => void
  selectAllDocuments: () => void
  clearDocumentSelection: () => void

  // ==================== 对话状态 ====================
  messages: Message[]
  currentConversationId: string | null
  conversations: ConversationListItem[]
  isGenerating: boolean
  currentCitations: Citation[]  // 当前消息的引用列表
  setMessages: (messages: Message[]) => void
  setCurrentConversationId: (id: string | null) => void
  setConversations: (conversations: ConversationListItem[]) => void
  addConversation: (conversation: ConversationListItem) => void
  removeConversation: (id: string) => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  updateLastMessageCitations: (citations: Citation[]) => void
  clearMessages: () => void
  setIsGenerating: (value: boolean) => void
  setCurrentCitations: (citations: Citation[]) => void
  startNewConversation: () => void

  // ==================== Agent 状态 ====================
  agentStates: AgentState[]
  setAgentState: (type: AgentState['type'], status: AgentState['status'], detail?: string) => void
  clearAgentStates: () => void

  // ==================== 编辑器状态 ====================
  editorContent: string
  setEditorContent: (content: string) => void
  appendToEditor: (content: string) => void

  // ==================== UI 状态 ====================
  activePanel: 'library' | 'chat' | 'editor'
  setActivePanel: (panel: 'library' | 'chat' | 'editor') => void
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  // ==================== 项目状态 ====================
  projects: [],
  currentProjectId: null,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
    })),

  setCurrentProject: (id) =>
    set({
      currentProjectId: id,
      // 切换项目时清空选中的文献、文档列表、消息、对话ID和对话列表
      selectedDocumentIds: [],
      documents: [],
      messages: [],
      currentConversationId: null,
      conversations: [],
    }),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  // ==================== 文献状态 ====================
  documents: [],
  selectedDocumentIds: [],

  setDocuments: (documents) => set({ documents }),

  addDocument: (document) =>
    set((state) => ({
      documents: [document, ...state.documents],
    })),

  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      selectedDocumentIds: state.selectedDocumentIds.filter((i) => i !== id),
    })),

  toggleDocumentSelection: (id) =>
    set((state) => ({
      selectedDocumentIds: state.selectedDocumentIds.includes(id)
        ? state.selectedDocumentIds.filter((i) => i !== id)
        : [...state.selectedDocumentIds, id],
    })),

  selectAllDocuments: () =>
    set((state) => ({
      selectedDocumentIds: state.documents.map((d) => d.id),
    })),

  clearDocumentSelection: () => set({ selectedDocumentIds: [] }),

  // ==================== 对话状态 ====================
  messages: [],
  currentConversationId: null,
  conversations: [],
  isGenerating: false,
  currentCitations: [],

  setMessages: (messages) => set({ messages }),

  setCurrentConversationId: (id) => set({ currentConversationId: id }),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      // 如果删除的是当前对话，清空当前对话ID
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
    })),

  startNewConversation: () =>
    set({
      messages: [],
      currentConversationId: null,
      currentCitations: [],
    }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages]
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1]
        messages[messages.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + content,
        }
      }
      return { messages }
    }),

  updateLastMessageCitations: (citations) =>
    set((state) => {
      const messages = [...state.messages]
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1]
        messages[messages.length - 1] = {
          ...lastMessage,
          citations: citations,
        }
      }
      return { messages }
    }),

  clearMessages: () => set({ messages: [], currentCitations: [], currentConversationId: null }),

  setIsGenerating: (value) => set({ isGenerating: value }),

  setCurrentCitations: (citations) => set({ currentCitations: citations }),

  // ==================== Agent 状态 ====================
  agentStates: [],

  setAgentState: (type, status, detail) =>
    set((state) => {
      const agentStates = [...state.agentStates]
      const index = agentStates.findIndex((a) => a.type === type)
      if (index >= 0) {
        agentStates[index] = { type, status, detail }
      } else {
        agentStates.push({ type, status, detail })
      }
      return { agentStates }
    }),

  clearAgentStates: () => set({ agentStates: [] }),

  // ==================== 编辑器状态 ====================
  editorContent: '',

  setEditorContent: (content) => set({ editorContent: content }),

  appendToEditor: (content) =>
    set((state) => ({
      editorContent: state.editorContent + content,
    })),

  // ==================== UI 状态 ====================
  activePanel: 'chat',
  setActivePanel: (panel) => set({ activePanel: panel }),

  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}))

