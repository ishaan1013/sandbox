"use client"

import { X } from "lucide-react"
import { Button } from "./button"

export default function Tab({
  children,
  onClick,
  onClose,
}: {
  children: React.ReactNode
  onClick?: () => void
  onClose?: () => void
}) {
  return (
    <Button
      onClick={onClick ?? undefined}
      size="sm"
      variant="secondary"
      className="group select-none"
    >
      {children}
      <div
        onClick={onClose ?? undefined}
        className=" p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center translate-x-1 transition-colors bg-transparent hover:bg-muted-foreground/25 rounded-sm"
      >
        <X className="w-3 h-3" />
      </div>
    </Button>
  )
}
