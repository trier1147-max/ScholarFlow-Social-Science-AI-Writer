import { toast } from '@/hooks/useToast'
import { API_BASE_URL } from './config'

export interface ApiError {
  message: string
  status?: number
  detail?: string
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * 统一的请求方法
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    showErrorToast: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      // 处理非 2xx 响应
      if (!response.ok) {
        let errorMessage = `Request failed: ${response.status}`
        let errorDetail = ''

        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.detail || errorMessage
          errorDetail = errorData.detail || ''
        } catch {
          // 无法解析错误响应，使用默认消息
        }

        const error: ApiError = {
          message: errorMessage,
          status: response.status,
          detail: errorDetail,
        }

        // 显示错误提示
        if (showErrorToast) {
          toast.error(errorMessage, 'Request Failed')
        }

        throw error
      }

      // 处理空响应（204 No Content 等）
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      // 网络错误或其他异常
      if (error instanceof Error && !(error as any).status) {
        const networkError: ApiError = {
          message: 'Network error. Please check your connection.',
          detail: error.message,
        }

        if (showErrorToast) {
          toast.error('网络错误，请检查连接', 'Network Error')
        }

        throw networkError
      }

      throw error
    }
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string, showErrorToast: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, showErrorToast)
  }

  /**
   * POST 请求
   */
  async post<T>(
    endpoint: string,
    data?: any,
    showErrorToast: boolean = true
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      showErrorToast
    )
  }

  /**
   * PUT 请求
   */
  async put<T>(
    endpoint: string,
    data?: any,
    showErrorToast: boolean = true
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      showErrorToast
    )
  }

  /**
   * PATCH 请求
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    showErrorToast: boolean = true
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      showErrorToast
    )
  }

  /**
   * DELETE 请求
   */
  async delete<T>(endpoint: string, showErrorToast: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, showErrorToast)
  }

  /**
   * DELETE 请求（带请求体）
   */
  async deleteWithBody<T>(
    endpoint: string,
    data?: any,
    showErrorToast: boolean = true
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'DELETE',
        body: data ? JSON.stringify(data) : undefined,
      },
      showErrorToast
    )
  }

  /**
   * 上传文件
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    showErrorToast: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const formData = new FormData()
    formData.append('file', file)

    // 添加额外的表单数据
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // 不设置 Content-Type，让浏览器自动设置（包含 boundary）
      })

      if (!response.ok) {
        let errorMessage = `Upload failed: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.detail || errorMessage
        } catch {
          // 无法解析错误响应
        }

        if (showErrorToast) {
          toast.error(errorMessage, 'Upload Failed')
        }

        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error && showErrorToast) {
        toast.error(error.message, 'Upload Error')
      }
      throw error
    }
  }
}

// 创建默认的 API 客户端实例
export const apiClient = new ApiClient()

// 导出便捷方法
export const api = {
  get: <T>(endpoint: string, showErrorToast?: boolean) =>
    apiClient.get<T>(endpoint, showErrorToast),
  post: <T>(endpoint: string, data?: any, showErrorToast?: boolean) =>
    apiClient.post<T>(endpoint, data, showErrorToast),
  put: <T>(endpoint: string, data?: any, showErrorToast?: boolean) =>
    apiClient.put<T>(endpoint, data, showErrorToast),
  patch: <T>(endpoint: string, data?: any, showErrorToast?: boolean) =>
    apiClient.patch<T>(endpoint, data, showErrorToast),
  delete: <T>(endpoint: string, showErrorToast?: boolean) =>
    apiClient.delete<T>(endpoint, showErrorToast),
  deleteWithBody: <T>(
    endpoint: string,
    data?: any,
    showErrorToast?: boolean
  ) => apiClient.deleteWithBody<T>(endpoint, data, showErrorToast),
  uploadFile: <T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    showErrorToast?: boolean
  ) => apiClient.uploadFile<T>(endpoint, file, additionalData, showErrorToast),
}
