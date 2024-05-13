"use client";

import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Link,
  RotateCw,
  TerminalSquare,
  UnfoldVertical,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

export default function PreviewWindow({
  collapsed,
  open,
  sandboxId,
}: {
  collapsed: boolean;
  open: () => void;
  sandboxId: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

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
                {/* Todo, make this open inspector */}
                <PreviewButton disabled onClick={() => {}}>
                  <TerminalSquare className="w-4 h-4" />
                </PreviewButton>

                <PreviewButton
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `http://${sandboxId}.sandbox.ishaand.com`
                    );
                    toast.info("Copied preview link to clipboard");
                  }}
                >
                  <Link className="w-4 h-4" />
                </PreviewButton>
                <PreviewButton
                  onClick={() => {
                    if (ref.current) {
                      ref.current.contentWindow?.location.reload();
                    }
                  }}
                >
                  <RotateCw className="w-3 h-3" />
                </PreviewButton>
              </>
            )}
          </div>
        </div>
      </div>
      {collapsed ? null : (
        <div className="w-full grow rounded-md overflow-hidden bg-foreground">
          <iframe
            ref={ref}
            width={"100%"}
            height={"100%"}
            src={`http://${sandboxId}.sandbox.ishaand.com`}
          />
        </div>
      )}
    </>
  );
}

function PreviewButton({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`${
        disabled ? "pointer-events-none opacity-50" : ""
      } p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
