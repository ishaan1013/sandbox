"use client";

import { Sandbox } from "@/lib/types";
import { Ellipsis, Globe, Lock, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProjectCardDropdown({
  sandbox,
  onVisibilityChange,
  onDelete,
}: {
  sandbox: Sandbox;
  onVisibilityChange: (sandbox: Sandbox) => void;
  onDelete: (sandbox: Sandbox) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="h-6 w-6 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 rounded-sm outline-foreground"
      >
        <Ellipsis className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onVisibilityChange(sandbox);
          }}
          className="cursor-pointer"
        >
          {sandbox.visibility === "public" ? (
            <>
              <Lock className="mr-2 h-4 w-4" />
              <span>Make Private</span>
            </>
          ) : (
            <>
              <Globe className="mr-2 h-4 w-4" />
              <span>Make Public</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(sandbox);
          }}
          className="!text-destructive cursor-pointer"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete Project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
