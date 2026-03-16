"use client"

import { useToast } from "@/hooks/useToast"
import { Toast, ToastContainer } from "@/components/ui/toast"

export function ToastProvider() {
  const { toasts, removeToast } = useToast()

  return (
    <ToastContainer>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </ToastContainer>
  )
}
