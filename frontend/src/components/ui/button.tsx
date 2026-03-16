import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          // 基础样式
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          // 变体样式
          {
            // default - 主要按钮
            "bg-slate-900 text-white hover:bg-slate-800": variant === "default",
            // secondary - 次要按钮
            "bg-slate-100 text-slate-900 hover:bg-slate-200": variant === "secondary",
            // outline - 边框按钮
            "border border-slate-300 bg-transparent hover:bg-slate-100": variant === "outline",
            // ghost - 幽灵按钮
            "hover:bg-slate-100 hover:text-slate-900": variant === "ghost",
            // destructive - 危险按钮
            "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
          },
          // 尺寸样式
          {
            "h-10 px-4 py-2": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-12 px-6 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

