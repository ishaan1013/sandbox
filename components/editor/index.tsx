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
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Terminal,
  TerminalSquare,
  X,
} from "lucide-react"
import Tab from "../ui/tab"

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
            <Tab>index.html</Tab>
            <Tab>style.css</Tab>
          </div>
          <div className="grow w-full overflow-hidden rounded-md">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              onMount={handleEditorMount}
              options={{
                minimap: {
                  enabled: false,
                },
                padding: {
                  bottom: 4,
                  top: 4,
                },
                scrollBeyondLastLine: false,
              }}
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
              <div className="h-10 select-none w-full flex gap-2">
                <div className="h-8 rounded-md px-3 text-xs bg-secondary flex items-center w-full justify-between">
                  Preview
                  <div className="flex space-x-1 translate-x-1">
                    <div className="p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 rounded-sm">
                      <TerminalSquare className="w-4 h-4" />
                    </div>
                    <div className="p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 rounded-sm">
                      <ChevronLeft className="w-4 h-4" />
                    </div>
                    <div className="p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 rounded-sm">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                    <div className="p-0.5 h-5 w-5 ml-0.5 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 rounded-sm">
                      <RotateCw className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full grow rounded-md bg-foreground"></div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={50}
              minSize={20}
              className="p-2 flex flex-col"
            >
              <div className="h-10 w-full flex gap-2">
                <Tab>Node</Tab>
                <Tab>Console</Tab>
              </div>
              <div className="w-full grow rounded-md bg-secondary"></div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  )
}
