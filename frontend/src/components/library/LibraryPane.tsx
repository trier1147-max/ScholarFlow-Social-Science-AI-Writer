"use client"

import { useState, useRef, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/useToast"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { 
  Upload, 
  Search, 
  FileText, 
  CheckSquare, 
  Trash2,
  Loader2
} from "lucide-react"

export function LibraryPane() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { 
    documents, 
    selectedDocumentIds, 
    toggleDocumentSelection,
    addDocument,
    removeDocument,
    setDocuments,
    currentProjectId,
    updateProject,
    projects
  } = useAppStore()

  // 根据项目加载文献
  useEffect(() => {
    if (currentProjectId) {
      loadDocuments()
    }
  }, [currentProjectId])

  const loadDocuments = async () => {
    if (!currentProjectId) return
    
    try {
      const result = await api.get<{ data: any[] }>(`/api/projects/${currentProjectId}/documents`, false)
      if (result.data) {
        setDocuments(result.data)
      }
    } catch (error) {
      console.error("Failed to load documents:", error)
    }
  }

  // 将上传的文献添加到当前项目
  const addDocumentToProject = async (documentId: string) => {
    if (!currentProjectId) return
    
    try {
      await api.post(`/api/projects/${currentProjectId}/documents`, { document_ids: [documentId] }, false)
      
      // 更新项目文献数量
      const currentProject = projects.find(p => p.id === currentProjectId)
      if (currentProject) {
        updateProject(currentProjectId, { document_count: currentProject.document_count + 1 })
      }
    } catch (error) {
      console.error("Failed to add document to project:", error)
    }
  }

  // 从项目中移除文献
  const handleRemoveDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentProjectId) return
    
    try {
      await api.deleteWithBody(
        `/api/projects/${currentProjectId}/documents`,
        { document_ids: [docId] },
        false
      )
      
      removeDocument(docId)
      
      // 更新项目文献数量
      const currentProject = projects.find(p => p.id === currentProjectId)
      if (currentProject) {
        updateProject(currentProjectId, { document_count: Math.max(0, currentProject.document_count - 1) })
      }
    } catch (error) {
      console.error("Failed to remove document:", error)
    }
  }

  // 过滤文献
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.authors.some(author => 
      author.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    console.log('Files selected:', files)
    if (!files || files.length === 0) return

    setIsUploading(true)
    
    for (const file of Array.from(files)) {
      try {
        console.log('Uploading file:', file.name)
        
        // 创建 FormData 用于文件上传
        const formData = new FormData()
        formData.append('file', file)
        
        console.log('Sending request to backend...')
        
        // 调用后端上传 API
        const result = await api.uploadFile<{ data: any }>('/api/documents/upload', file, undefined, true)
        
        // 添加到前端状态
        if (result.data) {
          const newDoc = {
            id: result.data.id,
            title: result.data.title,
            authors: result.data.authors || ['未知作者'],
            year: result.data.year,
            source: result.data.source,
            abstract: result.data.abstract,
            file_path: result.data.file_path,
            chunk_count: result.data.chunk_count || 0,
            created_at: result.data.created_at
          }
          addDocument(newDoc)
          
          // 如果有当前项目，自动关联
          if (currentProjectId) {
            await addDocumentToProject(result.data.id)
          }
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(
          error instanceof Error ? error.message : '未知错误',
          "Upload Failed"
        )
      } finally {
        console.log('Upload attempt finished for:', file.name)
      }
    }
    console.log('All uploads finished')
    
    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isSelected = (id: string) => selectedDocumentIds.includes(id)

  return (
    <div className="flex h-full flex-col px-4">
      {/* 上传按钮 */}
      <div className="mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          className="w-full bg-blue-600 text-white hover:bg-blue-700 h-9 text-sm font-medium"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Add Documents
            </>
          )}
        </Button>
      </div>

      {/* 搜索框 */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 border-slate-200 bg-white pl-9 text-sm focus-visible:ring-1 focus-visible:ring-slate-300"
          />
        </div>
      </div>

      {/* 选中数量提示 */}
      {selectedDocumentIds.length > 0 && (
        <div className="mb-3 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          {selectedDocumentIds.length} selected for AI reference
        </div>
      )}

      {/* 文献列表 */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="mb-3 rounded-xl bg-slate-100 p-3">
              <FileText className="h-6 w-6 text-slate-300" />
            </div>
            <p className="font-medium text-slate-600 text-sm">No documents yet</p>
            <p className="text-xs text-slate-400 mt-1">Upload PDFs to get started</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  "group cursor-pointer rounded-lg border p-3 transition-all hover:shadow-sm",
                  isSelected(doc.id)
                    ? "border-blue-500 bg-blue-50/70"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
                onClick={() => toggleDocumentSelection(doc.id)}
              >
                <div className="flex items-start gap-2.5">
                  {/* 选择框 */}
                  <div className="mt-0.5 shrink-0">
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                      isSelected(doc.id)
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    )}>
                      {isSelected(doc.id) && <CheckSquare className="h-3 w-3" />}
                    </div>
                  </div>
                  
                  {/* 文献信息 */}
                  <div className="min-w-0 flex-1">
                    <h4 className={cn(
                      "font-medium line-clamp-2 text-sm leading-snug",
                      isSelected(doc.id) ? "text-blue-900" : "text-slate-700"
                    )}>
                      {doc.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      {doc.authors.join(', ')}
                    </p>
                  </div>

                  {/* 删除按钮 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => handleRemoveDocument(doc.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

