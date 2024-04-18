import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const Button = ({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        className,
        "gradient-button-bg p-[1px] inline-flex group rounded-md text-sm font-medium focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      <div className="rounded-[6px] w-full gradient-button flex items-center justify-center whitespace-nowrap px-4 py-2 h-9">
        <Plus className="w-4 h-4 mr-2" />
        New Project
      </div>
    </button>
  )
}

export default Button
