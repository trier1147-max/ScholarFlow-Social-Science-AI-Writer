"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/dialog"
import { toast } from "@/hooks/useToast"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  MessageSquare,
  Loader2,
  ArrowRight
} from "lucide-react"
import type { Project } from "@/types"

interface ProjectListProps {
  onSelectProject: (projectId: string) => void
}

export function ProjectList({ onSelectProject }: ProjectListProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; projectId: string | null }>({
    open: false,
    projectId: null
  })

  const { projects, setProjects, addProject, removeProject, updateProject } = useAppStore()

  // 加载项目列表
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setIsFetching(true)
    try {
      const result = await api.get<{ data: Project[] }>("/api/projects?page_size=100")
      if (result.data) {
        setProjects(result.data)
      }
    } catch (error) {
      console.error("Failed to load projects:", error)
    } finally {
      setIsFetching(false)
    }
  }

  // 创建项目
  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return

    setIsLoading(true)
    try {
      const result = await api.post<{ data: Project }>("/api/projects", {
        title: newProjectTitle.trim(),
        description: newProjectDescription.trim() || null
      })
      
      if (result.data) {
        addProject(result.data)
        toast.success("项目创建成功", "Project Created")
        // 自动进入新创建的项目
        onSelectProject(result.data.id)
      }
    } catch (error) {
      console.error("Failed to create project:", error)
    } finally {
      setIsLoading(false)
      setIsCreating(false)
      setNewProjectTitle("")
      setNewProjectDescription("")
    }
  }

  // 删除项目
  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirm({ open: true, projectId: id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.projectId) return
    
    try {
      await api.delete(`/api/projects/${deleteConfirm.projectId}`)
      removeProject(deleteConfirm.projectId)
      toast.success("项目已删除", "Project Deleted")
    } catch (error) {
      console.error("Failed to delete project:", error)
    } finally {
      setDeleteConfirm({ open: false, projectId: null })
    }
  }

  // 更新项目标题
  const handleUpdateTitle = async (id: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      await api.patch(`/api/projects/${id}`, { title: editingTitle.trim() })
      updateProject(id, { title: editingTitle.trim() })
      toast.success("项目名称已更新", "Project Updated")
    } catch (error) {
      console.error("Failed to update project:", error)
    } finally {
      setEditingId(null)
      setEditingTitle("")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 头部 */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">ScholarFlow</h1>
              <p className="mt-1 text-sm text-slate-500">AI-powered academic writing assistant</p>
            </div>
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* 创建项目表单 */}
        {isCreating && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Create New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="e.g., Literature Review on AI Ethics"
                  className="h-11"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description <span className="text-slate-400">(optional)</span>
                </label>
                <Input
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Brief description of your project..."
                  className="h-11"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateProject}
                  disabled={isLoading || !newProjectTitle.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Create Project
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false)
                    setNewProjectTitle("")
                    setNewProjectDescription("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm text-slate-500">Loading projects...</p>
          </div>
        ) : projects.length === 0 && !isCreating ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 rounded-2xl bg-slate-100 p-6">
              <FolderOpen className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900">No projects yet</h3>
            <p className="mb-6 max-w-sm text-center text-slate-500">
              Create your first project to start organizing your research and writing with AI assistance.
            </p>
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Project
            </Button>
          </div>
        ) : (
          /* 项目列表 */
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Your Projects ({projects.length})
            </h2>
            <div className="grid gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                  onClick={() => onSelectProject(project.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      {editingId === project.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateTitle(project.id)
                              if (e.key === "Escape") setEditingId(null)
                            }}
                            className="h-9"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            onClick={() => handleUpdateTitle(project.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2">
                              <FolderOpen className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                                {project.title}
                              </h3>
                              {project.description && (
                                <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* 统计信息 */}
                          <div className="mt-4 flex items-center gap-6 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-4 w-4" />
                              <span>{project.document_count} documents</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="h-4 w-4" />
                              <span>{project.draft_count} drafts</span>
                            </div>
                            <div className="text-slate-400">
                              Updated {formatDate(project.updated_at)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div
                      className="ml-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(project.id)
                          setEditingTitle(project.title)
                        }}
                      >
                        <Edit2 className="h-4 w-4 text-slate-400" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                      >
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                      </Button>
                      <div className="ml-2 rounded-full bg-blue-100 p-1.5 opacity-0 group-hover:opacity-100">
                        <ArrowRight className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, projectId: null })}
        title="Delete Project"
        description="确定要删除此项目吗？项目内的文献关联将被解除。"
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
