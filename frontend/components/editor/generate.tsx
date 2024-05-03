"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Check, Loader2, RotateCw, Sparkles, X } from "lucide-react"

export default function GenerateInput({
  cancel,
  submit,
  width,
  onExpand,
  onAccept,
}: {
  cancel: () => void
  submit: (input: string) => void
  width: number
  onExpand: () => void
  onAccept: (code: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [code, setCode] = useState(`function add(a: number, b: number): number {
    return a + b;
  }
  
  const result = add(2, 3);
  console.log(result);`)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState("")
  const [currentPrompt, setCurrentPrompt] = useState("")

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setCurrentPrompt(input)
    // const res = await generateCode()
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setExpanded(true)
    onExpand()
    setLoading(false)
  }

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
          disabled={loading || input === ""}
          onClick={handleGenerate}
        >
          {loading ? (
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
            <pre>{code}</pre>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => onAccept(code)} size="sm">
              <Check className="h-3 w-3 mr-2" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-muted-foreground"
            >
              <RotateCw className="h-3 w-3 mr-2" />
              Re-Generate
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
