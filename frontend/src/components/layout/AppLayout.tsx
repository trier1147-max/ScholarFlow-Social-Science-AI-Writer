"use client"

import { useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ProjectList } from "@/components/project/ProjectList"
import { Workspace } from "@/components/layout/Workspace"

export function AppLayout() {
  const { currentProjectId, setCurrentProject } = useAppStore()
  const [lastProjectId, setLastProjectId] = usePersistedState<string | null>('scholarflow-last-project-id', null)

  // 首次加载时，如果有上次的项目ID，自动恢复
  useEffect(() => {
    if (!currentProjectId && lastProjectId) {
      setCurrentProject(lastProjectId)
    }
  }, []) // 只在首次挂载时执行

  // 当项目切换时，保存到 localStorage
  useEffect(() => {
    if (currentProjectId) {
      setLastProjectId(currentProjectId)
    }
  }, [currentProjectId, setLastProjectId])

  const handleSelectProject = (projectId: string) => {
    setCurrentProject(projectId)
  }

  const handleBackToProjects = () => {
    setCurrentProject(null)
  }

  // 如果没有选中项目，显示项目列表
  if (!currentProjectId) {
    return <ProjectList onSelectProject={handleSelectProject} />
  }

  // 如果选中了项目，显示工作区
  return <Workspace onBackToProjects={handleBackToProjects} />
}
