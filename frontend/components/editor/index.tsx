"use client"

import Editor, { OnMount } from "@monaco-editor/react"
import monaco from "monaco-editor"
import { useEffect, useRef, useState } from "react"
// import theme from "./theme.json"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  ChevronLeft,
  ChevronRight,
  FileJson,
  RotateCw,
  TerminalSquare,
} from "lucide-react"
import Tab from "../ui/tab"
import Sidebar from "./sidebar"
import { useClerk } from "@clerk/nextjs"
import { TFile, TFileData, TFolder, TTab } from "./sidebar/types"

import { io } from "socket.io-client"
import { processFileType, validateName } from "@/lib/utils"
import { toast } from "sonner"
import EditorTerminal from "./terminal"

import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"

import { decodeTerminalResponse } from "@/lib/utils"

export default function CodeEditor({
  userId,
  sandboxId,
}: {
  userId: string
  sandboxId: string
}) {
  const clerk = useClerk()

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
  }

  const [files, setFiles] = useState<(TFolder | TFile)[]>([])
  const [editorLanguage, setEditorLanguage] = useState("plaintext")
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [tabs, setTabs] = useState<TTab[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const socket = io(
    `http://localhost:4000?userId=${userId}&sandboxId=${sandboxId}`
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()

        const activeTab = tabs.find((t) => t.id === activeId)
        console.log("saving:", activeTab?.name, editorRef.current?.getValue())

        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeId ? { ...tab, saved: true } : tab
          )
        )

        socket.emit("saveFile", activeId, editorRef.current?.getValue())
      }
    }
    document.addEventListener("keydown", down)

    return () => {
      document.removeEventListener("keydown", down)
    }
  }, [tabs, activeId])

  // WS event handlers:

  // connection/disconnection effect
  useEffect(() => {
    socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [])

  // event listener effect
  useEffect(() => {
    const onConnect = () => {}

    const onDisconnect = () => {}

    const onLoadedEvent = (files: (TFolder | TFile)[]) => {
      console.log("onLoadedEvent")
      setFiles(files)
    }

    socket.on("connect", onConnect)

    socket.on("disconnect", onDisconnect)
    socket.on("loaded", onLoadedEvent)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("loaded", onLoadedEvent)
    }
  }, [])

  // Helper functions:

  const selectFile = (tab: TTab) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.id === tab.id)
      if (exists) {
        // console.log("exists")
        setActiveId(exists.id)
        return prev
      }
      return [...prev, tab]
    })
    socket.emit("getFile", tab.id, (response: string) => {
      setActiveFile(response)
    })
    setEditorLanguage(processFileType(tab.name))
    setActiveId(tab.id)
  }

  const closeTab = (tab: TFile) => {
    const numTabs = tabs.length
    const index = tabs.findIndex((t) => t.id === tab.id)
    const nextId =
      activeId === tab.id
        ? numTabs === 1
          ? null
          : index < numTabs - 1
          ? tabs[index + 1].id
          : tabs[index - 1].id
        : activeId
    const nextTab = tabs.find((t) => t.id === nextId)

    if (nextTab) selectFile(nextTab)
    else setActiveId(null)
    setTabs((prev) => prev.filter((t) => t.id !== tab.id))
  }

  const handleRename = (
    id: string,
    newName: string,
    oldName: string,
    type: "file" | "folder"
  ) => {
    if (!validateName(newName, oldName, type)) return false

    // Action
    socket.emit("renameFile", id, newName)
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, name: newName } : tab))
    )

    return true
  }

  return (
    <>
      <Sidebar
        files={files}
        selectFile={selectFile}
        handleRename={handleRename}
        socket={socket}
        addNew={(name, type) => {
          if (type === "file") {
            console.log("adding file")
            setFiles((prev) => [
              ...prev,
              { id: `projects/${sandboxId}/${name}`, name, type: "file" },
            ])
          } else {
            console.log("adding folder")
            // setFiles(prev => [...prev, { id, name, type: "folder", children: [] }])
          }
        }}
      />
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
                saved={tab.saved}
                selected={activeId === tab.id}
                onClick={() => {
                  selectFile(tab)
                }}
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
                  <FileJson className="w-6 h-6 mr-3" />
                  No file selected.
                </div>
              </>
            ) : clerk.loaded ? (
              <Editor
                height="100%"
                // defaultLanguage="typescript"
                language={editorLanguage}
                onMount={handleEditorMount}
                onChange={(value) => {
                  setTabs((prev) =>
                    prev.map((tab) =>
                      tab.id === activeId ? { ...tab, saved: false } : tab
                    )
                  )
                }}
                options={{
                  minimap: {
                    enabled: false,
                  },
                  padding: {
                    bottom: 4,
                    top: 4,
                  },
                  scrollBeyondLastLine: false,
                  fixedOverflowWidgets: true,
                }}
                theme="vs-dark"
                value={activeFile ?? ""}
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
              <div className="w-full relative grow rounded-md bg-secondary">
                {socket ? <EditorTerminal socket={socket} /> : null}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  )
}
