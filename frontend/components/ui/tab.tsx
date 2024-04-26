"use client"

import { X } from "lucide-react"
import { Button } from "./button"
import { useEffect } from "react"

export default function Tab({
  children,
  selected,
  onClick,
  onClose,
}: {
  children: React.ReactNode
  selected?: boolean
  onClick?: () => void
  onClose?: () => void
}) {
  return (
    <Button
      onClick={onClick ?? undefined}
      size="sm"
      variant={"secondary"}
      className={`group font-normal select-none ${
        selected
          ? "bg-neutral-700 hover:bg-neutral-600 text-foreground"
          : "text-muted-foreground"
      }`}
    >
      {children}
      <div
        onClick={
          onClose
            ? (e) => {
                e.stopPropagation()
                e.preventDefault()
                onClose()
              }
            : undefined
        }
        className="h-5 w-5 ml-0.5 flex items-center justify-center translate-x-1 transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm"
      >
        <X className="w-3 h-3" />
      </div>
    </Button>
  )
}
