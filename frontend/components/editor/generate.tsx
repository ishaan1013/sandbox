"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import { Check, Loader2, RotateCw, Sparkles, X } from "lucide-react"
import { Socket } from "socket.io-client"
import { Editor } from "@monaco-editor/react"
import { User } from "@/lib/types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const WEB_REFERENCES_SETTING = "sandbox.webReferences"

type Source = { url: string; title?: string }

function safeSources(sources: unknown): Source[] {
  if (!Array.isArray(sources)) return []
  return sources.flatMap((source) => {
    try {
      if (typeof source?.url !== "string") return []
      const url = new URL(source.url)
      if (
        (url.protocol !== "https:" && url.protocol !== "http:") ||
        url.username || url.password
      ) return []
      return [{
        url: url.href,
        title: typeof source.title === "string" ? source.title : url.hostname,
      }]
    } catch {
      return []
    }
  })
}

export default function GenerateInput({
  user,
  socket,
  width,
  data,
  editor,
  onExpand,
  onAccept,
  onClose,
}: {
  user: User
  socket: Socket
  width: number
  data: {
    fileName: string
    code: string
    line: number
  }
  editor: {
    language: string
  }
  onExpand: () => void
  onAccept: (code: string) => void
  onClose: () => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  // One popup is one research run, including regenerations and follow-up prompts.
  const searchSessionId = useRef<string>()
  const activeRequestId = useRef<string>()

  const [code, setCode] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState({
    generate: false,
    regenerate: false,
  })
  const [input, setInput] = useState("")
  const [currentPrompt, setCurrentPrompt] = useState("")
  const [webReferences, setWebReferences] = useState(true)
  const [sources, setSources] = useState<Source[]>([])

  useEffect(() => {
    try {
      setWebReferences(localStorage.getItem(WEB_REFERENCES_SETTING) !== "false")
    } catch {
      // Storage can be unavailable in private browsing. Keep the visible choice usable.
    }
  }, [])

  useEffect(() => {
    return () => {
      if (activeRequestId.current) {
        socket.emit("cancelGeneration", activeRequestId.current)
        activeRequestId.current = undefined
      }
    }
  }, [socket])

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleGenerate = async ({
    regenerate = false,
  }: {
    regenerate?: boolean
  }) => {
    const prompt = regenerate ? currentPrompt : input
    if (!prompt.trim()) return
    if (user.generations >= 10) {
      toast.error("You reached the maximum # of generations.")
      return
    }

    setLoading({ generate: !regenerate, regenerate })
    if (!regenerate) setCurrentPrompt(input)
    searchSessionId.current ??= crypto.randomUUID()
    const requestId = crypto.randomUUID()
    activeRequestId.current = requestId
    socket.emit(
      "generateCode",
      data.fileName,
      data.code,
      data.line,
      prompt,
      {
        webSearch: webReferences,
        searchSessionId: searchSessionId.current,
        requestId,
      },
      (res: { response?: string; success: boolean; sources?: Source[]; error?: string }) => {
        if (activeRequestId.current !== requestId) return
        activeRequestId.current = undefined
        setLoading({ generate: false, regenerate: false })
        if (!res.success || typeof res.response !== "string") {
          toast.error(res.error || "Code generation failed.")
          return
        }
        setCode(res.response)
        setSources(safeSources(res.sources))
        router.refresh()
      }
    )
  }

  useEffect(() => {
    if (code) {
      setExpanded(true)
      onExpand()
    }
  }, [code])

  return (
    <div className="w-full pr-4 space-y-2">
      <div className="flex items-center font-sans space-x-2">
        <input
          ref={inputRef}
          style={{
            width: width + "px",
          }}
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Generate code with a prompt"
          className="h-8 w-full rounded-md border border-muted-foreground bg-transparent px-3 py-1 text-sm shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />

        <Button
          size="sm"
          disabled={loading.generate || loading.regenerate || !input.trim()}
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
        <Button
          onClick={onClose}
          aria-label="Close code generation"
          variant="outline"
          size="smIcon"
          className="bg-transparent shrink-0 border-muted-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <label className="flex items-start gap-2 text-xs font-sans text-muted-foreground">
        <input
          type="checkbox"
          checked={webReferences}
          disabled={loading.generate || loading.regenerate}
          onChange={(event) => {
            const enabled = event.target.checked
            setWebReferences(enabled)
            try {
              localStorage.setItem(WEB_REFERENCES_SETTING, String(enabled))
            } catch {
              // The choice still applies to this popup when storage is unavailable.
            }
          }}
        />
        <span>Web references: send this prompt to Parallel to find current documentation. File contents are not sent to search.</span>
      </label>
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
          {sources.length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-sans" aria-label="Web references">
              {sources.slice(0, 3).map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline max-w-48 truncate"
                >
                  {source.title || source.url}
                </a>
              ))}
            </div>
          ) : null}
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
  )
}
