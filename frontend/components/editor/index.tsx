"use client"

import { SetStateAction, useCallback, useEffect, useRef, useState } from "react"
import monaco from "monaco-editor"
import Editor, { BeforeMount, OnMount } from "@monaco-editor/react"
import { Socket, io } from "socket.io-client"
import { toast } from "sonner"
import { useClerk } from "@clerk/nextjs"

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
import { FileJson, Loader2, TerminalSquare } from "lucide-react"
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

export default function CodeEditor({
  userData,
  sandboxData,
  reactDefinitionFile,
}: {
  userData: User
  sandboxData: Sandbox
  reactDefinitionFile: string
}) {
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection if it doesn't exist
  if (!socketRef.current) {
    socketRef.current = io(
      `${window.location.protocol}//${window.location.hostname}:${process.env.NEXT_PUBLIC_SERVER_PORT}?userId=${userData.id}&sandboxId=${sandboxData.id}`,
      {
        timeout: 2000,
      }
    );}

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

  // Terminal state
  const [terminals, setTerminals] = useState<
    {
      id: string
      terminal: Terminal | null
    }[]
  >([])

  // Preview state
  const [previewURL, setPreviewURL] = useState<string>("");

  const isOwner = sandboxData.userId === userData.id
  const clerk = useClerk()

  // Liveblocks hooks
  const room = useRoom()
  const [provider, setProvider] = useState<TypedLiveblocksProvider>()
  const userInfo = useSelf((me) => me.info)
  
  // Liveblocks providers map to prevent reinitializing providers
  type ProviderData = {
    provider: LiveblocksProvider<never, never, never, never>;
    yDoc: Y.Doc;
    yText: Y.Text;
    binding?: MonacoBinding;
    onSync: (isSynced: boolean) => void;
  };
  const providersMap = useRef(new Map<string, ProviderData>());

  // Refs for libraries / features
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  const generateRef = useRef<HTMLDivElement>(null)
  const generateWidgetRef = useRef<HTMLDivElement>(null)
  const previewPanelRef = useRef<ImperativePanelHandle>(null)
  const editorPanelRef = useRef<ImperativePanelHandle>(null)

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
      editorRef?.changeViewZones(function (changeAccessor) {
        if (!generateRef.current) return
        const id = changeAccessor.addZone({
          afterLineNumber: cursorLine,
          heightInLines: 3,
          domNode: generateRef.current,
        })
        setGenerate((prev) => {
          return { ...prev, id, line: cursorLine }
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
      );
      console.log(`Saving file...${activeFileId}`);
      console.log(`Saving file...${value}`);
      socketRef.current?.emit("saveFile", activeFileId, value);
    }, Number(process.env.FILE_SAVE_DEBOUNCE_DELAY)||1000),
    [socketRef]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        debouncedSaveData(editorRef?.getValue(), activeFileId);
      }
    };
    document.addEventListener("keydown", down);

    return () => {
      document.removeEventListener("keydown", down);
    };
  }, [activeFileId, tabs, debouncedSaveData]);

  // Liveblocks live collaboration setup effect
  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeFileId)
    const model = editorRef?.getModel()

    if (!editorRef || !tab || !model) return

    let providerData: ProviderData;
  
    // When a file is opened for the first time, create a new provider and store in providersMap.
    if (!providersMap.current.has(tab.id)) {
      const yDoc = new Y.Doc();
      const yText = yDoc.getText(tab.id);
      const yProvider = new LiveblocksProvider(room, yDoc);

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
      providerData = { provider: yProvider, yDoc, yText, onSync };
      providersMap.current.set(tab.id, providerData);

    } else {
      // When a tab is opened that has been open before, reuse the existing provider.
      providerData = providersMap.current.get(tab.id)!;
    }

    const binding = new MonacoBinding(
      providerData.yText,
      model,
      new Set([editorRef]),
      providerData.provider.awareness as unknown as Awareness
    );

    providerData.binding = binding;
  
    setProvider(providerData.provider);

    return () => {
      // Cleanup logic
      if (binding) {
        binding.destroy();
      }
      if (providerData.binding) {
        providerData.binding = undefined;
      }
    };
  }, [editorRef, room, activeFileContent, activeFileId, tabs]);

    // Added this effect to clean up when the component unmounts
    useEffect(() => {
      return () => {
        // Clean up all providers when the component unmounts
        providersMap.current.forEach((data) => {
          if (data.binding) {
            data.binding.destroy();
          }
          data.provider.disconnect();
          data.yDoc.destroy();
        });
        providersMap.current.clear();
      };
    }, []);

  // Connection/disconnection effect
  useEffect(() => {
    socketRef.current?.connect()
    
    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

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

    socketRef.current?.on("connect", onConnect)
    socketRef.current?.on("disconnect", onDisconnect)
    socketRef.current?.on("loaded", onLoadedEvent)
    socketRef.current?.on("error", onError)
    socketRef.current?.on("terminalResponse", onTerminalResponse)
    socketRef.current?.on("disableAccess", onDisableAccess)
    socketRef.current?.on("previewURL", setPreviewURL)

    return () => {
      socketRef.current?.off("connect", onConnect)
      socketRef.current?.off("disconnect", onDisconnect)
      socketRef.current?.off("loaded", onLoadedEvent)
      socketRef.current?.off("error", onError)
      socketRef.current?.off("terminalResponse", onTerminalResponse)
      socketRef.current?.off("disableAccess", onDisableAccess)
      socketRef.current?.off("previewURL", setPreviewURL)
    }
    // }, []);
  }, [terminals])

  // Helper functions for tabs:

  // Select file and load content

  // Initialize debounced function once
  const fileCache = useRef(new Map());

  // Debounced function to get file content
  const debouncedGetFile = useCallback(
    debounce((tabId, callback) => {
      socketRef.current?.emit('getFile', tabId, callback);
    }, 300), // 300ms debounce delay, adjust as needed
    []
  );

  const selectFile = useCallback((tab: TTab) => {
    if (tab.id === activeFileId) return;

    setGenerate((prev) => ({ ...prev, show: false }));

    const exists = tabs.find((t) => t.id === tab.id);
    setTabs((prev) => {
      if (exists) {
        setActiveFileId(exists.id);
        return prev;
      }
      return [...prev, tab];
    });

    if (fileCache.current.has(tab.id)) {
      setActiveFileContent(fileCache.current.get(tab.id));
    } else {
      debouncedGetFile(tab.id, (response: SetStateAction<string>) => {
        fileCache.current.set(tab.id, response);
        setActiveFileContent(response);
      });
    }

    setEditorLanguage(processFileType(tab.name));
    setActiveFileId(tab.id);
  }, [activeFileId, tabs, debouncedGetFile]);

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

    socketRef.current?.emit("renameFile", id, newName)
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, name: newName } : tab))
    )

    return true
  }

  const handleDeleteFile = (file: TFile) => {
    socketRef.current?.emit("deleteFile", file.id, (response: (TFolder | TFile)[]) => {
      setFiles(response)
    })
    closeTab(file.id)
  }

  const handleDeleteFolder = (folder: TFolder) => {
    setDeletingFolderId(folder.id)
    console.log("deleting folder", folder.id)

    socketRef.current?.emit("getFolder", folder.id, (response: string[]) =>
      closeTabs(response)
    )

    socketRef.current?.emit("deleteFolder", folder.id, (response: (TFolder | TFile)[]) => {
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
      <div ref={generateRef} />
      <div className="z-50 p-1" ref={generateWidgetRef}>
        {generate.show && ai ? (
          <GenerateInput
            user={userData}
            socket={socketRef.current}
            width={generate.width - 90}
            data={{
              fileName: tabs.find((t) => t.id === activeFileId)?.name ?? "",
              code: editorRef?.getValue() ?? "",
              line: generate.line,
            }}
            editor={{
              language: editorLanguage,
            }}
            onExpand={() => {
              editorRef?.changeViewZones(function (changeAccessor) {
                changeAccessor.removeZone(generate.id)

                if (!generateRef.current) return
                const id = changeAccessor.addZone({
                  afterLineNumber: cursorLine,
                  heightInLines: 12,
                  domNode: generateRef.current,
                })
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
              const file = editorRef?.getValue()

              const lines = file?.split("\n") || []
              lines.splice(line - 1, 0, code)
              const updatedFile = lines.join("\n")
              editorRef?.setValue(updatedFile)
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
        socket={socketRef.current}
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
              ref={previewPanelRef}
              defaultSize={4}
              collapsedSize={4}
              minSize={25}
              collapsible
              className="p-2 flex flex-col"
              onCollapse={() => setIsPreviewCollapsed(true)}
              onExpand={() => setIsPreviewCollapsed(false)}
            >
              <PreviewWindow
                collapsed={isPreviewCollapsed}
                open={() => {
                  previewPanelRef.current?.expand()
                  setIsPreviewCollapsed(false)
                }}
                src={previewURL}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={50}
              minSize={20}
              className="p-2 flex flex-col"
            >
              {isOwner ? (
                <Terminals
                  terminals={terminals}
                  setTerminals={setTerminals}
                  socket={socketRef.current}
                />
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
    </>
  )
}

