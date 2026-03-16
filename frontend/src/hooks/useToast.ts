import { create } from 'zustand'
import type { ToastType } from '@/components/ui/toast'

export interface ToastItem {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))
    return id
  },
  
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  
  clearAll: () => set({ toasts: [] }),
}))

// Helper functions for easier usage
export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    useToast.getState().addToast({ type: 'success', message, title, duration })
  },
  error: (message: string, title?: string, duration?: number) => {
    useToast.getState().addToast({ type: 'error', message, title, duration })
  },
  warning: (message: string, title?: string, duration?: number) => {
    useToast.getState().addToast({ type: 'warning', message, title, duration })
  },
  info: (message: string, title?: string, duration?: number) => {
    useToast.getState().addToast({ type: 'info', message, title, duration })
  },
}
