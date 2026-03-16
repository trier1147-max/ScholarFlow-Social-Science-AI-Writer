"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="relative z-50 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  )
}

export function DialogContent({ 
  className, 
  children 
}: { 
  className?: string
  children: React.ReactNode 
}) {
  return (
    <div
      className={cn(
        "relative mx-4 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl",
        className
      )}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ 
  className, 
  children 
}: { 
  className?: string
  children: React.ReactNode 
}) {
  return (
    <div className={cn("mb-4 space-y-1.5", className)}>
      {children}
    </div>
  )
}

export function DialogTitle({ 
  className, 
  children 
}: { 
  className?: string
  children: React.ReactNode 
}) {
  return (
    <h2 className={cn("text-lg font-semibold text-slate-900", className)}>
      {children}
    </h2>
  )
}

export function DialogDescription({ 
  className, 
  children 
}: { 
  className?: string
  children: React.ReactNode 
}) {
  return (
    <p className={cn("text-sm text-slate-500 whitespace-pre-line leading-relaxed", className)}>
      {children}
    </p>
  )
}

export function DialogFooter({ 
  className, 
  children 
}: { 
  className?: string
  children: React.ReactNode 
}) {
  return (
    <div className={cn("mt-6 flex justify-end gap-3", className)}>
      {children}
    </div>
  )
}

// Confirm Dialog - 专门用于确认操作
export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            className={variant === "default" ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
