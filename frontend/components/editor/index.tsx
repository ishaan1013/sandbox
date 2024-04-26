"use client"

import Editor, { OnMount } from "@monaco-editor/react"
import monaco from "monaco-editor"
import { useRef, useState } from "react"
// import theme from "./theme.json"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  TerminalSquare,
} from "lucide-react"
import Tab from "../ui/tab"
import Sidebar from "./sidebar"
import { useClerk } from "@clerk/nextjs"
import { TFile, TFolder } from "./sidebar/types"

export default function CodeEditor({ files }: { files: (TFile | TFolder)[] }) {
  // const editorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null)

  // const handleEditorMount: OnMount = (editor, monaco) => {
  //   editorRef.current = editor
  // }

  const clerk = useClerk()

  const [tabs, setTabs] = useState<TFile[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const selectFile = (tab: TFile) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.id === tab.id)
      if (exists) {
        setActiveId(exists.id)
        return prev
      }
      return [...prev, tab]
    })
    setActiveId(tab.id)
  }

  const closeTab = (tab: TFile) => {
    const numTabs = tabs.length
    const index = tabs.findIndex((t) => t.id === tab.id)
    setActiveId((prev) => {
      const next =
        prev === tab.id
          ? numTabs === 1
            ? null
            : index < numTabs - 1
            ? tabs[index + 1].id
            : tabs[index - 1].id
          : prev

      return next
    })
    setTabs((prev) => prev.filter((t) => t.id !== tab.id))
  }

  return (
    <>
      <Sidebar files={files} selectFile={selectFile} />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          className="p-2 flex flex-col"
          maxSize={75}
          minSize={30}
          defaultSize={60}
        >
          <div className="h-10 w-full flex gap-2">
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                selected={activeId === tab.id}
                onClick={() => setActiveId(tab.id)}
                onClose={() => closeTab(tab)}
              >
                {tab.name}
              </Tab>
            ))}
          </div>
          <div className="grow w-full overflow-hidden rounded-md">
            {activeId === null ? (
              <>
                <div className="w-full h-full flex items-center justify-center text-xl font-medium text-secondary select-none">
                  No file selected.
                </div>
              </>
            ) : clerk.loaded ? (
              <Editor
                height="100%"
                defaultLanguage="typescript"
                // onMount={handleEditorMount}
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
            ) : null}
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
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={50}
              minSize={20}
              className="p-2 flex flex-col"
            >
              <div className="h-10 w-full flex gap-2">
                <Tab selected>Node</Tab>
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
