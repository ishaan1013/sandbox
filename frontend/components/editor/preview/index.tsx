"use client";

import {
  ChevronLeft,
  ChevronRight,
  Globe,
  RotateCw,
  TerminalSquare,
  UnfoldVertical,
} from "lucide-react";

export default function PreviewWindow({
  collapsed,
  open,
}: {
  collapsed: boolean;
  open: () => void;
}) {
  return (
    <>
      <div
        className={`${
          collapsed ? "h-full" : "h-10"
        } select-none w-full flex gap-2`}
      >
        <div className="h-8 rounded-md px-3 bg-secondary flex items-center w-full justify-between">
          <div className="text-xs">
            Preview
            <span className="inline-block ml-2 items-center font-mono text-muted-foreground">
              localhost:3000
            </span>
          </div>
          <div className="flex space-x-1 translate-x-1">
            {collapsed ? (
              <PreviewButton onClick={open}>
                <UnfoldVertical className="w-4 h-4" />
              </PreviewButton>
            ) : (
              <>
                <PreviewButton onClick={() => console.log("Terminal")}>
                  <TerminalSquare className="w-4 h-4" />
                </PreviewButton>
                <PreviewButton onClick={() => console.log("Back")}>
                  <ChevronLeft className="w-4 h-4" />
                </PreviewButton>
                <PreviewButton onClick={() => console.log("Forward")}>
                  <ChevronRight className="w-4 h-4" />
                </PreviewButton>
                <PreviewButton onClick={() => console.log("Reload")}>
                  <RotateCw className="w-3 h-3" />
                </PreviewButton>
              </>
            )}
          </div>
        </div>
      </div>
      {collapsed ? null : (
        <div className="w-full grow rounded-md bg-foreground"></div>
      )}
    </>
  );
}

function PreviewButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      className="p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm"
      onClick={onClick}
    >
      {children}
    </div>
  );
}
