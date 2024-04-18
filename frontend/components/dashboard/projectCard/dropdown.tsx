"use client"

import { Sandbox } from "@/lib/types"
import { Ellipsis, Lock, Trash2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ProjectCardDropdown({ sandbox }: { sandbox: Sandbox }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        className="h-6 w-6 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 rounded-sm"
      >
        <Ellipsis className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <DropdownMenuItem>
          <Lock className="mr-2 h-4 w-4" />
          <span>Make Private</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="!text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete Project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
