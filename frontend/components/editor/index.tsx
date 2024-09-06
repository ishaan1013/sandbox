"use client"

import { SetStateAction, useCallback, useEffect, useRef, useState } from "react"
import * as monaco from "monaco-editor"
import Editor, { BeforeMount, OnMount } from "@monaco-editor/react"
import { toast } from "sonner"
import { useClerk } from "@clerk/nextjs"
import { AnimatePresence, motion } from "framer-motion"

import * as Y from "yjs"
import LiveblocksProvider from "@liveblocks/yjs"
import { MonacoBinding } from "y-monaco"
import { Awareness } from "y-protocols/awareness"
import { TypedLiveblocksProvider, useRoom, useSelf } from "@/liveblocks.config"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { FileJson, Loader2, Sparkles, TerminalSquare } from "lucide-react"
import Tab from "../ui/tab"
import Sidebar from "./sidebar"
import GenerateInput from "./generate"
import { Sandbox, User, TFile, TFolder, TTab } from "@/lib/types"
import { addNew, processFileType, validateName, debounce } from "@/lib/utils"
import { Cursors } from "./live/cursors"
import { Terminal } from "@xterm/xterm"
import DisableAccessModal from "./live/disableModal"
import Loading from "./loading"
import PreviewWindow from "./preview"
import Terminals from "./terminals"
import { ImperativePanelHandle } from "react-resizable-panels"
import { PreviewProvider, usePreview } from "@/context/PreviewContext"
import { useSocket } from "@/context/SocketContext"
import { Button } from "../ui/button"
import React from "react"

export default function CodeEditor({
  userData,
  sandboxData,
}: {
  userData: User
  sandboxData: Sandbox
}) {
  //SocketContext functions and effects
  const { socket, setUserAndSandboxId } = useSocket()

  useEffect(() => {
    // Ensure userData.id and sandboxData.id are available before attempting to connect
    if (userData.id && sandboxData.id) {
      // Check if the socket is not initialized or not connected
      if (!socket || (socket && !socket.connected)) {
        // Initialize socket connection
        setUserAndSandboxId(userData.id, sandboxData.id)
      }
    }
  }, [socket, userData.id, sandboxData.id, setUserAndSandboxId])

  //Preview Button state
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(true)
  const [disableAccess, setDisableAccess] = useState({
    isDisabled: false,
    message: "",
  })

  // File state
  const [files, setFiles] = useState<(TFolder | TFile)[]>([])
  const [tabs, setTabs] = useState<TTab[]>([])
  const [activeFileId, setActiveFileId] = useState<string>("")
  const [activeFileContent, setActiveFileContent] = useState("")
  const [deletingFolderId, setDeletingFolderId] = useState("")

  // Editor state
  const [editorLanguage, setEditorLanguage] = useState("plaintext")
  const [cursorLine, setCursorLine] = useState(0)
  const [editorRef, setEditorRef] =
    useState<monaco.editor.IStandaloneCodeEditor>()

  // AI Copilot state
  const [ai, setAi] = useState(false)
  const [generate, setGenerate] = useState<{
    show: boolean
    id: string
    line: number
    widget: monaco.editor.IContentWidget | undefined
    pref: monaco.editor.ContentWidgetPositionPreference[]
    width: number
  }>({ show: false, line: 0, id: "", widget: undefined, pref: [], width: 0 })
  const [decorations, setDecorations] = useState<{
    options: monaco.editor.IModelDeltaDecoration[]
    instance: monaco.editor.IEditorDecorationsCollection | undefined
  }>({ options: [], instance: undefined })
  const [isSelected, setIsSelected] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
  // Terminal state
  const [terminals, setTerminals] = useState<
    {
      id: string
      terminal: Terminal | null
    }[]
  >([])

  // Preview state
  const [previewURL, setPreviewURL] = useState<string>("")

  const loadPreviewURL = (url: string) => {
    // This will cause a reload if previewURL changed.
    setPreviewURL(url)
    // If the URL didn't change, still reload the preview.
    previewWindowRef.current?.refreshIframe()
  }

  const isOwner = sandboxData.userId === userData.id
  const clerk = useClerk()

  // Liveblocks hooks
  const room = useRoom()
  const [provider, setProvider] = useState<TypedLiveblocksProvider>()
  const userInfo = useSelf((me) => me.info)

  // Liveblocks providers map to prevent reinitializing providers
  type ProviderData = {
    provider: LiveblocksProvider<never, never, never, never>
    yDoc: Y.Doc
    yText: Y.Text
    binding?: MonacoBinding
    onSync: (isSynced: boolean) => void
  }
  const providersMap = useRef(new Map<string, ProviderData>())

  // Refs for libraries / features
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  const generateRef = useRef<HTMLDivElement>(null)
  const suggestionRef = useRef<HTMLDivElement>(null)
  const generateWidgetRef = useRef<HTMLDivElement>(null)
  const previewPanelRef = useRef<ImperativePanelHandle>(null)
  const editorPanelRef = useRef<ImperativePanelHandle>(null)
  const previewWindowRef = useRef<{ refreshIframe: () => void }>(null)

  const debouncedSetIsSelected = useRef(
    debounce((value: boolean) => {
      setIsSelected(value)
    }, 800) //
  ).current
  // Pre-mount editor keybindings
  const handleEditorWillMount: BeforeMount = (monaco) => {
    monaco.editor.addKeybindingRules([
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG,
        command: "null",
      },
    ])
  }

  // Post-mount editor keybindings and actions
  const handleEditorMount: OnMount = (editor, monaco) => {
    setEditorRef(editor)
    monacoRef.current = monaco

    editor.onDidChangeCursorPosition((e) => {
      setIsSelected(false)
      const selection = editor.getSelection()
      if (selection !== null) {
        const hasSelection = !selection.isEmpty()
        debouncedSetIsSelected(hasSelection)
        setShowSuggestion(hasSelection)
      }
      const { column, lineNumber } = e.position
      if (lineNumber === cursorLine) return
      setCursorLine(lineNumber)

      const model = editor.getModel()
      const endColumn = model?.getLineContent(lineNumber).length || 0

      setDecorations((prev) => {
        return {
          ...prev,
          options: [
            {
              range: new monaco.Range(
                lineNumber,
                column,
                lineNumber,
                endColumn
              ),
              options: {
                afterContentClassName: "inline-decoration",
              },
            },
          ],
        }
      })
    })

    editor.onDidBlurEditorText((e) => {
      setDecorations((prev) => {
        return {
          ...prev,
          options: [],
        }
      })
    })

    editor.addAction({
      id: "generate",
      label: "Generate",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG],
      precondition:
        "editorTextFocus && !suggestWidgetVisible && !renameInputVisible && !inSnippetMode && !quickFixWidgetVisible",
      run: () => {
        setGenerate((prev) => {
          return {
            ...prev,
            show: !prev.show,
            pref: [monaco.editor.ContentWidgetPositionPreference.BELOW],
          }
        })
      },
    })
  }
  const handleAiEdit = React.useCallback(() => {
    if (!editorRef) return
    const selection = editorRef.getSelection()
    if (!selection) return
    const pos = selection.getPosition()
    const start = selection.getStartPosition()
    const end = selection.getEndPosition()
    let pref: monaco.editor.ContentWidgetPositionPreference
    let id = ""
    const isMultiline = start.lineNumber !== end.lineNumber
    if (isMultiline) {
      if (pos.lineNumber <= start.lineNumber) {
        pref = monaco.editor.ContentWidgetPositionPreference.ABOVE
      } else {
        pref = monaco.editor.ContentWidgetPositionPreference.BELOW
      }
    } else {
      pref = monaco.editor.ContentWidgetPositionPreference.ABOVE
    }
    editorRef.changeViewZones(function (changeAccessor) {
      if (!generateRef.current) return
      if (pref === monaco.editor.ContentWidgetPositionPreference.ABOVE) {
        id = changeAccessor.addZone({
          afterLineNumber: start.lineNumber - 1,
          heightInLines: 2,
          domNode: generateRef.current,
        })
      }
    })
    setGenerate((prev) => {
      return {
        ...prev,
        show: true,
        pref: [pref],
        id,
      }
    })
  }, [editorRef])
  // Generate widget effect
  useEffect(() => {
    if (!ai) {
      setGenerate((prev) => {
        return {
          ...prev,
          show: false,
        }
      })
      return
    }
    if (generate.show) {
      setShowSuggestion(false)
      editorRef?.changeViewZones(function (changeAccessor) {
        if (!generateRef.current) return
        if (!generate.id) {
          const id = changeAccessor.addZone({
            afterLineNumber: cursorLine,
            heightInLines: 3,
            domNode: generateRef.current,
          })
          setGenerate((prev) => {
            return { ...prev, id, line: cursorLine }
          })
        }
        setGenerate((prev) => {
          return { ...prev, line: cursorLine }
        })
      })

      if (!generateWidgetRef.current) return
      const widgetElement = generateWidgetRef.current

      const contentWidget = {
        getDomNode: () => {
          return widgetElement
        },
        getId: () => {
          return "generate.widget"
        },
        getPosition: () => {
          return {
            position: {
              lineNumber: cursorLine,
              column: 1,
            },
            preference: generate.pref,
          }
        },
      }

      // window width - sidebar width, times the percentage of the editor panel
      const width = editorPanelRef.current
        ? (editorPanelRef.current.getSize() / 100) * (window.innerWidth - 224)
        : 400 //fallback

      setGenerate((prev) => {
        return {
          ...prev,
          widget: contentWidget,
          width,
        }
      })
      editorRef?.addContentWidget(contentWidget)

      if (generateRef.current && generateWidgetRef.current) {
        editorRef?.applyFontInfo(generateRef.current)
        editorRef?.applyFontInfo(generateWidgetRef.current)
      }
    } else {
      editorRef?.changeViewZones(function (changeAccessor) {
        changeAccessor.removeZone(generate.id)
        setGenerate((prev) => {
          return { ...prev, id: "" }
        })
      })

      if (!generate.widget) return
      editorRef?.removeContentWidget(generate.widget)
      setGenerate((prev) => {
        return {
          ...prev,
          widget: undefined,
        }
      })
    }
  }, [generate.show])
  // Suggestion widget effect
  useEffect(() => {
    if (!suggestionRef.current || !editorRef) return
    const widgetElement = suggestionRef.current
    const suggestionWidget: monaco.editor.IContentWidget = {
      getDomNode: () => {
        return widgetElement
      },
      getId: () => {
        return "suggestion.widget"
      },
      getPosition: () => {
        const selection = editorRef?.getSelection()
        const column = Math.max(3, selection?.positionColumn ?? 1)
        let lineNumber = selection?.positionLineNumber ?? 1
        let pref = monaco.editor.ContentWidgetPositionPreference.ABOVE
        if (lineNumber <= 3) {
          pref = monaco.editor.ContentWidgetPositionPreference.BELOW
        }
        return {
          preference: [pref],
          position: {
            lineNumber,
            column,
          },
        }
      },
    }
    if (isSelected) {
      editorRef?.addContentWidget(suggestionWidget)
      editorRef?.applyFontInfo(suggestionRef.current)
    } else {
      editorRef?.removeContentWidget(suggestionWidget)
    }
  }, [isSelected])

  // Decorations effect for generate widget tips
  useEffect(() => {
    if (decorations.options.length === 0) {
      decorations.instance?.clear()
    }

    if (!ai) return

    const model = editorRef?.getModel()
    const line = model?.getLineContent(cursorLine)

    if (line === undefined || line.trim() !== "") {
      decorations.instance?.clear()
      return
    }

    if (decorations.instance) {
      decorations.instance.set(decorations.options)
    } else {
      const instance = editorRef?.createDecorationsCollection()
      instance?.set(decorations.options)

      setDecorations((prev) => {
        return {
          ...prev,
          instance,
        }
      })
    }
  }, [decorations.options])

  // Save file keybinding logic effect
  const debouncedSaveData = useCallback(
    debounce((value: string | undefined, activeFileId: string | undefined) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeFileId ? { ...tab, saved: true } : tab
        )
      )
      console.log(`Saving file...${activeFileId}`)
      console.log(`Saving file...${value}`)
      socket?.emit("saveFile", activeFileId, value)
    }, Number(process.env.FILE_SAVE_DEBOUNCE_DELAY) || 1000),
    [socket]
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        debouncedSaveData(editorRef?.getValue(), activeFileId)
      }
    }
    document.addEventListener("keydown", down)

    return () => {
      document.removeEventListener("keydown", down)
    }
  }, [activeFileId, tabs, debouncedSaveData])

  // Liveblocks live collaboration setup effect
  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeFileId)
    const model = editorRef?.getModel()

    if (!editorRef || !tab || !model) return

    let providerData: ProviderData

    // When a file is opened for the first time, create a new provider and store in providersMap.
    if (!providersMap.current.has(tab.id)) {
      const yDoc = new Y.Doc()
      const yText = yDoc.getText(tab.id)
      const yProvider = new LiveblocksProvider(room, yDoc)

      // Inserts the file content into the editor once when the tab is changed.
      const onSync = (isSynced: boolean) => {
        if (isSynced) {
          const text = yText.toString()
          if (text === "") {
            if (activeFileContent) {
              yText.insert(0, activeFileContent)
            } else {
              setTimeout(() => {
                yText.insert(0, editorRef.getValue())
              }, 0)
            }
          }
        }
      }

      yProvider.on("sync", onSync)

      // Save the provider to the map.
      providerData = { provider: yProvider, yDoc, yText, onSync }
      providersMap.current.set(tab.id, providerData)
    } else {
      // When a tab is opened that has been open before, reuse the existing provider.
      providerData = providersMap.current.get(tab.id)!
    }

    const binding = new MonacoBinding(
      providerData.yText,
      model,
      new Set([editorRef]),
      providerData.provider.awareness as unknown as Awareness
    )

    providerData.binding = binding
    setProvider(providerData.provider)

    return () => {
      // Cleanup logic
      if (binding) {
        binding.destroy()
      }
      if (providerData.binding) {
        providerData.binding = undefined
      }
    }
  }, [room, activeFileContent])

  // Added this effect to clean up when the component unmounts
  useEffect(() => {
    return () => {
      // Clean up all providers when the component unmounts
      providersMap.current.forEach((data) => {
        if (data.binding) {
          data.binding.destroy()
        }
        data.provider.disconnect()
        data.yDoc.destroy()
      })
      providersMap.current.clear()
    }
  }, [])

  // Connection/disconnection effect
  useEffect(() => {
    socket?.connect()
    return () => {
      socket?.disconnect()
    }
  }, [socket])

  // Socket event listener effect
  useEffect(() => {
    const onConnect = () => {}

    const onDisconnect = () => {
      setTerminals([])
    }

    const onLoadedEvent = (files: (TFolder | TFile)[]) => {
      setFiles(files)
    }

    const onError = (message: string) => {
      toast.error(message)
    }

    const onTerminalResponse = (response: { id: string; data: string }) => {
      const term = terminals.find((t) => t.id === response.id)
      if (term && term.terminal) {
        term.terminal.write(response.data)
      }
    }

    const onDisableAccess = (message: string) => {
      if (!isOwner)
        setDisableAccess({
          isDisabled: true,
          message,
        })
    }

    socket?.on("connect", onConnect)
    socket?.on("disconnect", onDisconnect)
    socket?.on("loaded", onLoadedEvent)
    socket?.on("error", onError)
    socket?.on("terminalResponse", onTerminalResponse)
    socket?.on("disableAccess", onDisableAccess)
    socket?.on("previewURL", loadPreviewURL)

    return () => {
      socket?.off("connect", onConnect)
      socket?.off("disconnect", onDisconnect)
      socket?.off("loaded", onLoadedEvent)
      socket?.off("error", onError)
      socket?.off("terminalResponse", onTerminalResponse)
      socket?.off("disableAccess", onDisableAccess)
      socket?.off("previewURL", loadPreviewURL)
    }
  }, [
    socket,
    terminals,
    setTerminals,
    setFiles,
    toast,
    setDisableAccess,
    isOwner,
    loadPreviewURL,
  ])

  // Helper functions for tabs:

  // Select file and load content

  // Initialize debounced function once
  const fileCache = useRef(new Map())

  // Debounced function to get file content
  const debouncedGetFile = (tabId: any, callback: any) => {
    socket?.emit("getFile", tabId, callback)
  } // 300ms debounce delay, adjust as needed

  const selectFile = (tab: TTab) => {
    if (tab.id === activeFileId) return

    setGenerate((prev) => ({ ...prev, show: false }))

    const exists = tabs.find((t) => t.id === tab.id)
    setTabs((prev) => {
      if (exists) {
        setActiveFileId(exists.id)
        return prev
      }
      return [...prev, tab]
    })

    if (fileCache.current.has(tab.id)) {
      setActiveFileContent(fileCache.current.get(tab.id))
    } else {
      debouncedGetFile(tab.id, (response: SetStateAction<string>) => {
        fileCache.current.set(tab.id, response)
        setActiveFileContent(response)
      })
    }

    setEditorLanguage(processFileType(tab.name))
    setActiveFileId(tab.id)
  }

  // Close tab and remove from tabs
  const closeTab = (id: string) => {
    const numTabs = tabs.length
    const index = tabs.findIndex((t) => t.id === id)

    console.log("closing tab", id, index)

    if (index === -1) return

    const nextId =
      activeFileId === id
        ? numTabs === 1
          ? null
          : index < numTabs - 1
          ? tabs[index + 1].id
          : tabs[index - 1].id
        : activeFileId

    setTabs((prev) => prev.filter((t) => t.id !== id))

    if (!nextId) {
      setActiveFileId("")
    } else {
      const nextTab = tabs.find((t) => t.id === nextId)
      if (nextTab) {
        selectFile(nextTab)
      }
    }
  }

  const closeTabs = (ids: string[]) => {
    const numTabs = tabs.length

    if (numTabs === 0) return

    const allIndexes = ids.map((id) => tabs.findIndex((t) => t.id === id))

    const indexes = allIndexes.filter((index) => index !== -1)
    if (indexes.length === 0) return

    console.log("closing tabs", ids, indexes)

    const activeIndex = tabs.findIndex((t) => t.id === activeFileId)

    const newTabs = tabs.filter((t) => !ids.includes(t.id))
    setTabs(newTabs)

    if (indexes.length === numTabs) {
      setActiveFileId("")
    } else {
      const nextTab =
        newTabs.length > activeIndex
          ? newTabs[activeIndex]
          : newTabs[newTabs.length - 1]
      if (nextTab) {
        selectFile(nextTab)
      }
    }
  }

  const handleRename = (
    id: string,
    newName: string,
    oldName: string,
    type: "file" | "folder"
  ) => {
    const valid = validateName(newName, oldName, type)
    if (!valid.status) {
      if (valid.message) toast.error("Invalid file name.")
      return false
    }

    socket?.emit("renameFile", id, newName)
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, name: newName } : tab))
    )

    return true
  }

  const handleDeleteFile = (file: TFile) => {
    socket?.emit("deleteFile", file.id, (response: (TFolder | TFile)[]) => {
      setFiles(response)
    })
    closeTab(file.id)
  }

  const handleDeleteFolder = (folder: TFolder) => {
    setDeletingFolderId(folder.id)
    console.log("deleting folder", folder.id)

    socket?.emit("getFolder", folder.id, (response: string[]) =>
      closeTabs(response)
    )

    socket?.emit("deleteFolder", folder.id, (response: (TFolder | TFile)[]) => {
      setFiles(response)
      setDeletingFolderId("")
    })
  }

  // On disabled access for shared users, show un-interactable loading placeholder + info modal
  if (disableAccess.isDisabled)
    return (
      <>
        <DisableAccessModal
          message={disableAccess.message}
          open={disableAccess.isDisabled}
          setOpen={() => {}}
        />
        <Loading />
      </>
    )

  return (
    <>
      {/* Copilot DOM elements */}
      <PreviewProvider>
        <div ref={generateRef} />
        <div ref={suggestionRef} className="absolute">
          <AnimatePresence>
            {isSelected && ai && showSuggestion && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ ease: "easeOut", duration: 0.2 }}
              >
                <Button size="xs" type="submit" onClick={handleAiEdit}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Edit Code
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="z-50 p-1" ref={generateWidgetRef}>
          {generate.show && ai ? (
            <GenerateInput
              user={userData}
              socket={socket!}
              width={generate.width - 90}
              data={{
                fileName: tabs.find((t) => t.id === activeFileId)?.name ?? "",
                code:
                  (isSelected && editorRef?.getSelection()
                    ? editorRef
                        ?.getModel()
                        ?.getValueInRange(editorRef?.getSelection()!)
                    : editorRef?.getValue()) ?? "",
                line: generate.line,
              }}
              editor={{
                language: editorLanguage,
              }}
              onExpand={() => {
                const line = generate.line

                editorRef?.changeViewZones(function (changeAccessor) {
                  changeAccessor.removeZone(generate.id)

                  if (!generateRef.current) return
                  let id = ""
                  if (isSelected) {
                    const selection = editorRef?.getSelection()
                    if (!selection) return
                    const isAbove =
                      generate.pref?.[0] ===
                      monaco.editor.ContentWidgetPositionPreference.ABOVE
                    const afterLineNumber = isAbove ? line - 1 : line
                    id = changeAccessor.addZone({
                      afterLineNumber,
                      heightInLines: isAbove?11: 12,
                      domNode: generateRef.current,
                    })
                    const contentWidget= generate.widget
                    if (contentWidget){
                      editorRef?.layoutContentWidget(contentWidget)
                    }
                  } else {
                    id = changeAccessor.addZone({
                      afterLineNumber: cursorLine,
                      heightInLines: 12,

                      domNode: generateRef.current,
                    })
                  }
                  setGenerate((prev) => {
                    return { ...prev, id }
                  })
                })
              }}
              onAccept={(code: string) => {
                const line = generate.line
                setGenerate((prev) => {
                  return {
                    ...prev,
                    show: !prev.show,
                  }
                })
                const selection = editorRef?.getSelection()
                const range =
                  isSelected && selection
                    ? selection
                    : new monaco.Range(line, 1, line, 1)
                editorRef?.executeEdits("ai-generation", [
                  { range, text: code, forceMoveMarkers: true },
                ])
              }}
              onClose={() => {
                setGenerate((prev) => {
                  return {
                    ...prev,
                    show: !prev.show,
                  }
                })
              }}
            />
          ) : null}
        </div>

        {/* Main editor components */}
        <Sidebar
          sandboxData={sandboxData}
          files={files}
          selectFile={selectFile}
          handleRename={handleRename}
          handleDeleteFile={handleDeleteFile}
          handleDeleteFolder={handleDeleteFolder}
          socket={socket!}
          setFiles={setFiles}
          addNew={(name, type) => addNew(name, type, setFiles, sandboxData)}
          deletingFolderId={deletingFolderId}
          // AI Copilot Toggle
          ai={ai}
          setAi={setAi}
        />

        {/* Shadcn resizeable panels: https://ui.shadcn.com/docs/components/resizable */}
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            className="p-2 flex flex-col"
            maxSize={80}
            minSize={30}
            defaultSize={60}
            ref={editorPanelRef}
          >
            <div className="h-10 w-full flex gap-2 overflow-auto tab-scroll">
              {/* File tabs */}
              {tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  saved={tab.saved}
                  selected={activeFileId === tab.id}
                  onClick={(e) => {
                    selectFile(tab)
                  }}
                  onClose={() => closeTab(tab.id)}
                >
                  {tab.name}
                </Tab>
              ))}
            </div>
            {/* Monaco editor */}
            <div
              ref={editorContainerRef}
              className="grow w-full overflow-hidden rounded-md relative"
            >
              {!activeFileId ? (
                <>
                  <div className="w-full h-full flex items-center justify-center text-xl font-medium text-muted-foreground/50 select-none">
                    <FileJson className="w-6 h-6 mr-3" />
                    No file selected.
                  </div>
                </>
              ) : // Note clerk.loaded is required here due to a bug: https://github.com/clerk/javascript/issues/1643
              clerk.loaded ? (
                <>
                  {provider && userInfo ? (
                    <Cursors yProvider={provider} userInfo={userInfo} />
                  ) : null}
                  <Editor
                    height="100%"
                    language={editorLanguage}
                    beforeMount={handleEditorWillMount}
                    onMount={handleEditorMount}
                    onChange={(value) => {
                      if (value === activeFileContent) {
                        setTabs((prev) =>
                          prev.map((tab) =>
                            tab.id === activeFileId
                              ? { ...tab, saved: true }
                              : tab
                          )
                        )
                      } else {
                        setTabs((prev) =>
                          prev.map((tab) =>
                            tab.id === activeFileId
                              ? { ...tab, saved: false }
                              : tab
                          )
                        )
                      }
                    }}
                    options={{
                      tabSize: 2,
                      minimap: {
                        enabled: false,
                      },
                      padding: {
                        bottom: 4,
                        top: 4,
                      },
                      scrollBeyondLastLine: false,
                      fixedOverflowWidgets: true,
                      fontFamily: "var(--font-geist-mono)",
                    }}
                    theme="vs-dark"
                    value={activeFileContent}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-medium text-muted-foreground/50 select-none">
                  <Loader2 className="animate-spin w-6 h-6 mr-3" />
                  Waiting for Clerk to load...
                </div>
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel
                ref={usePreview().previewPanelRef}
                defaultSize={4}
                collapsedSize={4}
                minSize={25}
                collapsible
                className="p-2 flex flex-col"
                onCollapse={() => setIsPreviewCollapsed(true)}
                onExpand={() => setIsPreviewCollapsed(false)}
              >
                <PreviewWindow
                  open={() => {
                    usePreview().previewPanelRef.current?.expand()
                    setIsPreviewCollapsed(false)
                  }}
                  collapsed={isPreviewCollapsed}
                  src={previewURL}
                  ref={previewWindowRef}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel
                defaultSize={50}
                minSize={20}
                className="p-2 flex flex-col"
              >
                {isOwner ? (
                  <Terminals />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-medium text-muted-foreground/50 select-none">
                    <TerminalSquare className="w-4 h-4 mr-2" />
                    No terminal access.
                  </div>
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </PreviewProvider>
    </>
  )
}
