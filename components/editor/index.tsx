"use client"

import Editor, { OnMount } from "@monaco-editor/react"
import monaco from "monaco-editor"
import { useRef, useState } from "react"
import theme from "./theme.json"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Button } from "../ui/button"
import { X } from "lucide-react"

export default function CodeEditor() {
  const editorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null)
  const [code, setCode] = useState([
    {
      language: "css",
      name: "style.css",
      value: `body { background-color: #282c34; color: white; }`,
    },
    {
      language: "html",
      name: "index.html",
      value: `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello, world!</h1>
  <script src="script.js"></script>
</body>
</html>`,
    },
    {
      language: "javascript",
      name: "script.js",
      value: `console.log("Hello, world!")`,
    },
  ])

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // import("monaco-themes/themes/Blackboard.json").then((data) => {
    //   monaco.editor.defineTheme(
    //     "Blackboard",
    //     data as monaco.editor.IStandaloneThemeData
    //   )
    // })
    // monaco.editor.setTheme("Blackboard")
  }

  return (
    <>
      <div className="h-full w-52"></div>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          className="p-2 flex flex-col"
          maxSize={75}
          minSize={30}
          defaultSize={60}
        >
          <div className="h-10 w-full flex gap-2">
            <Button
              size="sm"
              className="min-w-20 justify-between"
              variant="secondary"
            >
              index.html <X className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              className="min-w-20 justify-between"
              variant="secondary"
            >
              style.css <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="grow w-full overflow-hidden rounded-lg">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              onMount={handleEditorMount}
              theme="vs-dark"
            />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel
              defaultSize={50}
              minSize={20}
              className="p-2 flex flex-col"
            >
              <div className="h-10 w-full flex gap-2">
                <Button
                  size="sm"
                  className="min-w-20 justify-between"
                  variant="secondary"
                >
                  localhost:3000 <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="w-full grow rounded-lg bg-foreground"></div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={50}
              minSize={20}
              className="p-2 flex flex-col"
            >
              <div className="h-10 w-full flex gap-2">
                <Button
                  size="sm"
                  className="min-w-20 justify-between"
                  variant="secondary"
                >
                  Node <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="w-full grow rounded-lg bg-secondary"></div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  )
}
