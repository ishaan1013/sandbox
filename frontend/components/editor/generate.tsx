"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Check, Loader2, RotateCw, Sparkles, X } from "lucide-react";
import { Socket } from "socket.io-client";
import { Editor } from "@monaco-editor/react";
import { User } from "@/lib/types";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
// import monaco from "monaco-editor"

export default function GenerateInput({
  user,
  socket,
  width,
  data,
  editor,
  onExpand,
  onAccept,
}: {
  user: User;
  socket: Socket;
  width: number;
  data: {
    fileName: string;
    code: string;
    line: number;
  };
  editor: {
    language: string;
  };
  onExpand: () => void;
  onAccept: (code: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState({
    generate: false,
    regenerate: false,
  });
  const [input, setInput] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState("");

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [inputRef.current]);

  const handleGenerate = async ({
    regenerate = false,
  }: {
    regenerate?: boolean;
  }) => {
    if (user.generations >= 30) {
      toast.error(
        "You reached the maximum # of generations. Contact @ishaandey_ on X/Twitter to reset :)"
      );
    }

    setLoading({ generate: !regenerate, regenerate });
    setCurrentPrompt(input);
    socket.emit(
      "generateCode",
      data.fileName,
      data.code,
      data.line,
      regenerate ? currentPrompt : input,
      (res: {
        result: {
          response: string;
        };
        success: boolean;
        errors: any[];
        messages: any[];
      }) => {
        if (!res.success) {
          console.error(res.errors);
          return;
        }

        setCode(res.result.response);
        router.refresh();
      }
    );
  };

  useEffect(() => {
    if (code) {
      setExpanded(true);
      onExpand();
      setLoading({ generate: false, regenerate: false });
    }
  }, [code]);

  return (
    <div className="w-full pr-4 space-y-2">
      <div className="flex items-center font-sans space-x-2">
        <input
          ref={inputRef}
          style={{
            width: width + "px",
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="✨ Generate code with a prompt"
          className="h-8 w-full rounded-md border border-muted-foreground bg-transparent px-3 py-1 text-sm shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />

        <Button
          size="sm"
          disabled={loading.generate || loading.regenerate || input === ""}
          onClick={() => handleGenerate({})}
        >
          {loading.generate ? (
            <>
              <Loader2 className="animate-spin h-3 w-3 mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-2" />
              Generate Code
            </>
          )}
        </Button>
      </div>
      {expanded ? (
        <>
          <div className="rounded-md border border-muted-foreground w-full h-28 overflow-y-scroll p-2">
            <Editor
              height="100%"
              defaultLanguage={editor.language}
              value={code}
              options={{
                minimap: {
                  enabled: false,
                },
                scrollBeyondLastLine: false,
                fontFamily: "var(--font-geist-mono)",
                domReadOnly: true,
                readOnly: true,
                lineNumbers: "off",
                glyphMargin: false,
                folding: false,
                // Undocumented see https://github.com/Microsoft/vscode/issues/30795#issuecomment-410998882
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
              }}
              theme="vs-dark"
            />
          </div>
          <div className="flex space-x-2 font-sans">
            <Button
              disabled={loading.generate || loading.regenerate}
              onClick={() => onAccept(code)}
              size="sm"
            >
              <Check className="h-3 w-3 mr-2" />
              Accept
            </Button>
            <Button
              onClick={() => handleGenerate({ regenerate: true })}
              disabled={loading.generate || loading.regenerate}
              variant="outline"
              size="sm"
              className="bg-transparent border-muted-foreground"
            >
              {loading.regenerate ? (
                <>
                  <Loader2 className="animate-spin h-3 w-3 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <RotateCw className="h-3 w-3 mr-2" />
                  Re-Generate
                </>
              )}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
