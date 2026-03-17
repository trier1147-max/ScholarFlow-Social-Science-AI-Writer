/**
 * API 请求配置和工具函数
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * 基础请求函数
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  const response = await fetch(url, config)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `请求失败: ${response.status}`)
  }

  return response.json()
}

// ==================== 文献 API ====================

export const documentApi = {
  /**
   * 上传文献
   */
  async upload(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || '上传失败')
    }

    return response.json()
  },

  /**
   * 获取文献列表
   */
  async list(params?: {
    page?: number
    page_size?: number
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString())
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    return request(`/api/documents${query ? `?${query}` : ''}`)
  },

  /**
   * 获取文献详情
   */
  async get(id: string) {
    return request(`/api/documents/${id}`)
  },

  /**
   * 删除文献
   */
  async delete(id: string) {
    return request(`/api/documents/${id}`, { method: 'DELETE' })
  },
}

// ==================== 对话 API ====================

export const chatApi = {
  /**
   * 发送消息（流式）
   */
  async sendMessage(
    message: string,
    documentIds: string[],
    options?: {
      conversationId?: string
      mode?: 'strict' | 'explore'
      onEvent?: (event: { type: string; data: Record<string, unknown> }) => void
    }
  ) {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message,
        document_ids: documentIds,
        conversation_id: options?.conversationId,
        mode: options?.mode || 'strict',
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || '发送失败')
    }

    // 处理 SSE 流
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('无法读取响应流')
    }

    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          const eventType = line.slice(7)
          continue
        }
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            options?.onEvent?.({ type: 'data', data })
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  },

  /**
   * 获取对话历史
   */
  async getHistory(conversationId: string) {
    return request(`/api/chat/${conversationId}/history`)
  },
}

// ==================== 写作 API ====================

export const writeApi = {
  /**
   * 生成大纲
   */
  async generateOutline(
    topic: string,
    documentIds: string[],
    type: 'literature_review' | 'research_paper' | 'thesis_chapter' = 'literature_review'
  ) {
    return request('/api/write/outline', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        document_ids: documentIds,
        outline_type: type,
      }),
    })
  },

  /**
   * 生成写作内容（流式）
   */
  async generate(
    instruction: string,
    documentIds: string[],
    options?: {
      outlineSection?: string
      length?: 'short' | 'medium' | 'long'
      onEvent?: (event: { type: string; data: Record<string, unknown> }) => void
    }
  ) {
    const response = await fetch(`${API_BASE_URL}/api/write/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        instruction,
        document_ids: documentIds,
        outline_section: options?.outlineSection,
        length: options?.length || 'medium',
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || '生成失败')
    }

    // SSE 流处理逻辑同 chatApi.sendMessage
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('无法读取响应流')
    }

    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            options?.onEvent?.({ type: 'data', data })
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  },

  /**
   * 润色文本
   */
  async polish(
    text: string,
    focus: ('remove_ai_tone' | 'enhance_terminology' | 'improve_flow' | 'add_hedging')[] = ['remove_ai_tone']
  ) {
    return request('/api/write/polish', {
      method: 'POST',
      body: JSON.stringify({ text, focus }),
    })
  },
}

// ==================== 引用 API ====================

export const citationApi = {
  /**
   * 获取引用详情
   */
  async get(chunkId: string) {
    return request(`/api/citations/${chunkId}`)
  },

  /**
   * 导出 BibTeX
   */
  async exportBibtex(documentIds: string[]) {
    const response = await fetch(`${API_BASE_URL}/api/citations/export/bibtex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_ids: documentIds }),
    })

    if (!response.ok) {
      throw new Error('导出失败')
    }

    return response.text()
  },
}

