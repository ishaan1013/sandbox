"use client";

import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  TerminalSquare,
} from "lucide-react";

export default function PreviewWindow() {
  return (
    <>
      <div className="h-10 select-none w-full flex gap-2">
        <div className="h-8 rounded-md px-3 text-xs bg-secondary flex items-center w-full justify-between">
          Preview
          <div className="flex space-x-1 translate-x-1">
            <div className="p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm">
              <TerminalSquare className="w-4 h-4" />
            </div>
            <div className="p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <div className="p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm">
              <ChevronRight className="w-4 h-4" />
            </div>
            <div className="p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm">
              <RotateCw className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
      <div className="w-full grow rounded-md bg-foreground"></div>
    </>
  );
}
