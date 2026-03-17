"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/dialog"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  FolderOpen,
  Plus,
  Check,
  Trash2,
  FileText,
  Edit2,
  X,
  ChevronDown,
  Loader2
} from "lucide-react"
import type { Project } from "@/types"

interface ProjectSelectorProps {
  onProjectChange?: (projectId: string | null) => void
}

export function ProjectSelector({ onProjectChange }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; projectId: string | null }>({
    open: false,
    projectId: null
  })

  const {
    projects,
    currentProjectId,
    setProjects,
    addProject,
    removeProject,
    setCurrentProject,
    updateProject
  } = useAppStore()

  // 加载项目列表
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const result = await api.get<{ data: Project[] }>("/api/projects?page_size=100", false)
      if (result.data) {
        setProjects(result.data)
      }
    } catch (error) {
      console.error("Failed to load projects:", error)
    }
  }

  // 创建项目
  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return
    
    setIsLoading(true)
    try {
      const result = await api.post<{ data: Project }>("/api/projects", {
        title: newProjectTitle.trim()
      })
      
      if (result.data) {
        addProject(result.data)
        setCurrentProject(result.data.id)
        onProjectChange?.(result.data.id)
      }
    } catch (error) {
      console.error("Failed to create project:", error)
    } finally {
      setIsLoading(false)
      setIsCreating(false)
      setNewProjectTitle("")
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
      await api.delete(`/api/projects/${deleteConfirm.projectId}`, false)
      removeProject(deleteConfirm.projectId)
      if (currentProjectId === deleteConfirm.projectId) {
        setCurrentProject(null)
        onProjectChange?.(null)
      }
    } catch (error) {
      console.error("Failed to delete project:", error)
    } finally {
      setDeleteConfirm({ open: false, projectId: null })
    }
  }

  // 选择项目
  const handleSelectProject = (id: string | null) => {
    setCurrentProject(id)
    onProjectChange?.(id)
    setIsOpen(false)
  }

  // 更新项目标题
  const handleUpdateTitle = async (id: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    
    try {
      await api.patch(`/api/projects/${id}`, { title: editingTitle.trim() }, false)
      updateProject(id, { title: editingTitle.trim() })
    } catch (error) {
      console.error("Failed to update project:", error)
    } finally {
      setEditingId(null)
      setEditingTitle("")
    }
  }

  const currentProject = projects.find(p => p.id === currentProjectId)

  return (
    <div className="relative">
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
          currentProject
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {currentProject ? currentProject.title : "All Documents"}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* 全部文献选项 */}
          <button
            onClick={() => handleSelectProject(null)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-slate-50",
              !currentProjectId && "bg-slate-50 text-blue-600"
            )}
          >
            <FileText className="h-4 w-4" />
            <span>All Documents</span>
            {!currentProjectId && <Check className="ml-auto h-4 w-4" />}
          </button>

          {/* 分隔线 */}
          {projects.length > 0 && <div className="border-t border-slate-100" />}

          {/* 项目列表 */}
          <div className="max-h-60 overflow-y-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-slate-50",
                  currentProjectId === project.id && "bg-blue-50"
                )}
              >
                {editingId === project.id ? (
                  <div className="flex flex-1 items-center gap-1">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateTitle(project.id)
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleUpdateTitle(project.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleSelectProject(project.id)}
                      className="flex flex-1 items-center gap-2 min-w-0"
                    >
                      <FolderOpen className={cn(
                        "h-4 w-4 shrink-0",
                        currentProjectId === project.id ? "text-blue-600" : "text-slate-400"
                      )} />
                      <div className="min-w-0 flex-1 text-left">
                        <div className={cn(
                          "truncate",
                          currentProjectId === project.id && "text-blue-600 font-medium"
                        )}>
                          {project.title}
                        </div>
                        <div className="text-xs text-slate-400">
                          {project.document_count} docs
                        </div>
                      </div>
                      {currentProjectId === project.id && (
                        <Check className="h-4 w-4 text-blue-600 shrink-0" />
                      )}
                    </button>
                    
                    {/* 操作按钮 */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(project.id)
                          setEditingTitle(project.title)
                        }}
                      >
                        <Edit2 className="h-3 w-3 text-slate-400" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                      >
                        <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* 分隔线 */}
          <div className="border-t border-slate-100" />

          {/* 创建项目 */}
          {isCreating ? (
            <div className="flex items-center gap-2 p-2">
              <Input
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="Project name..."
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject()
                  if (e.key === "Escape") setIsCreating(false)
                }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-8"
                onClick={handleCreateProject}
                disabled={isLoading || !newProjectTitle.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => {
                  setIsCreating(false)
                  setNewProjectTitle("")
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </button>
          )}
        </div>
      )}

      {/* 点击外部关闭 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, projectId: null })}
        title="Delete Project"
        description="确定要删除此项目吗？文献不会被删除，只会解除关联。"
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
