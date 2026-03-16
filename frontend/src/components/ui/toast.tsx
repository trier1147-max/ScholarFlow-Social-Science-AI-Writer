"use client"

import * as React from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "warning" | "info"

export interface ToastProps {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
  onClose: (id: string) => void
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const toastStyles = {
  success: "bg-green-50 border-green-200 text-green-900",
  error: "bg-red-50 border-red-200 text-red-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  info: "bg-blue-50 border-blue-200 text-blue-900",
}

const iconStyles = {
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-blue-600",
}

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const Icon = toastIcons[type]

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full max-w-md items-start gap-3 rounded-lg border p-4 shadow-lg transition-all",
        toastStyles[type],
        "animate-in slide-in-from-right-full fade-in"
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", iconStyles[type])} />
      <div className="flex-1 space-y-1">
        {title && <p className="font-semibold leading-tight">{title}</p>}
        <p className="text-sm leading-relaxed whitespace-pre-line">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 rounded-md p-1 hover:bg-black/5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed top-0 right-0 z-50 flex flex-col items-end gap-3 p-6">
      {children}
    </div>
  )
}
