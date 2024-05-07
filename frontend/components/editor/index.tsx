"use client";

import { useEffect, useRef, useState } from "react";
import monaco from "monaco-editor";
import Editor, { BeforeMount, OnMount } from "@monaco-editor/react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useClerk } from "@clerk/nextjs";
import { createId } from "@paralleldrive/cuid2";

import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import { TypedLiveblocksProvider, useRoom } from "@/liveblocks.config";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  ChevronLeft,
  ChevronRight,
  FileJson,
  Loader2,
  Plus,
  RotateCw,
  Shell,
  SquareTerminal,
  TerminalSquare,
} from "lucide-react";
import Tab from "../ui/tab";
import Sidebar from "./sidebar";
import EditorTerminal from "./terminal";
import { Button } from "../ui/button";
import GenerateInput from "./generate";
import { Sandbox, User, TFile, TFileData, TFolder, TTab } from "@/lib/types";
import { processFileType, validateName } from "@/lib/utils";
import { Cursors } from "./live/cursors";
import { Terminal } from "@xterm/xterm";

export default function CodeEditor({
  userData,
  sandboxData,
  isSharedUser,
}: {
  userData: User;
  sandboxData: Sandbox;
  isSharedUser: boolean;
}) {
  const [files, setFiles] = useState<(TFolder | TFile)[]>([]);
  const [tabs, setTabs] = useState<TTab[]>([]);
  const [editorLanguage, setEditorLanguage] = useState("plaintext");
  const [activeFileId, setActiveFileId] = useState<string>("");
  const [activeFileContent, setActiveFileContent] = useState("");
  const [cursorLine, setCursorLine] = useState(0);
  const [generate, setGenerate] = useState<{
    show: boolean;
    id: string;
    line: number;
    widget: monaco.editor.IContentWidget | undefined;
    pref: monaco.editor.ContentWidgetPositionPreference[];
    width: number;
  }>({ show: false, line: 0, id: "", widget: undefined, pref: [], width: 0 });
  const [decorations, setDecorations] = useState<{
    options: monaco.editor.IModelDeltaDecoration[];
    instance: monaco.editor.IEditorDecorationsCollection | undefined;
  }>({ options: [], instance: undefined });
  const [terminals, setTerminals] = useState<
    {
      id: string;
      terminal: Terminal | null;
    }[]
  >([]);
  const [activeTerminalId, setActiveTerminalId] = useState("");
  const [creatingTerminal, setCreatingTerminal] = useState(false);
  const [provider, setProvider] = useState<TypedLiveblocksProvider>();
  const [ai, setAi] = useState(false);

  const isOwner = sandboxData.userId === userData.id;
  const clerk = useClerk();
  const room = useRoom();
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId);
  console.log("activeTerminal", activeTerminal ? activeTerminal.id : "none");

  // const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [editorRef, setEditorRef] =
    useState<monaco.editor.IStandaloneCodeEditor>();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const generateRef = useRef<HTMLDivElement>(null);
  const generateWidgetRef = useRef<HTMLDivElement>(null);

  const handleEditorWillMount: BeforeMount = (monaco) => {
    monaco.editor.addKeybindingRules([
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG,
        command: "null",
        // when: "textInputFocus",
      },
    ]);
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    setEditorRef(editor);
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      const { column, lineNumber } = e.position;
      if (lineNumber === cursorLine) return;
      setCursorLine(lineNumber);

      const model = editor.getModel();
      const endColumn = model?.getLineContent(lineNumber).length || 0;

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
        };
      });
    });

    editor.onDidBlurEditorText((e) => {
      setDecorations((prev) => {
        return {
          ...prev,
          options: [],
        };
      });
    });

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
          };
        });
      },
    });
  };

  useEffect(() => {
    if (!ai) {
      setGenerate((prev) => {
        return {
          ...prev,
          show: false,
        };
      });
      return;
    }
    if (generate.show) {
      editorRef?.changeViewZones(function (changeAccessor) {
        if (!generateRef.current) return;
        const id = changeAccessor.addZone({
          afterLineNumber: cursorLine,
          heightInLines: 3,
          domNode: generateRef.current,
        });
        setGenerate((prev) => {
          return { ...prev, id, line: cursorLine };
        });
      });

      if (!generateWidgetRef.current) return;
      const widgetElement = generateWidgetRef.current;

      const contentWidget = {
        getDomNode: () => {
          return widgetElement;
        },
        getId: () => {
          return "generate.widget";
        },
        getPosition: () => {
          return {
            position: {
              lineNumber: cursorLine,
              column: 1,
            },
            preference: generate.pref,
          };
        },
      };

      setGenerate((prev) => {
        return { ...prev, widget: contentWidget };
      });
      editorRef?.addContentWidget(contentWidget);

      if (generateRef.current && generateWidgetRef.current) {
        editorRef?.applyFontInfo(generateRef.current);
        editorRef?.applyFontInfo(generateWidgetRef.current);
      }
    } else {
      editorRef?.changeViewZones(function (changeAccessor) {
        changeAccessor.removeZone(generate.id);
        setGenerate((prev) => {
          return { ...prev, id: "" };
        });
      });

      if (!generate.widget) return;
      editorRef?.removeContentWidget(generate.widget);
      setGenerate((prev) => {
        return {
          ...prev,
          widget: undefined,
        };
      });
    }
  }, [generate.show]);

  useEffect(() => {
    if (decorations.options.length === 0) {
      decorations.instance?.clear();
    }

    if (!ai) return;

    if (decorations.instance) {
      decorations.instance.set(decorations.options);
    } else {
      const instance = editorRef?.createDecorationsCollection();
      instance?.set(decorations.options);

      setDecorations((prev) => {
        return {
          ...prev,
          instance,
        };
      });
    }
  }, [decorations.options]);

  const socket = io(
    `http://localhost:4000?userId=${userData.id}&sandboxId=${sandboxData.id}`
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();

        // const activeTab = tabs.find((t) => t.id === activeFileId)
        // console.log("saving:", activeTab?.name, editorRef?.getValue())

        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeFileId ? { ...tab, saved: true } : tab
          )
        );

        socket.emit("saveFile", activeFileId, editorRef?.getValue());
      }
    };
    document.addEventListener("keydown", down);

    return () => {
      document.removeEventListener("keydown", down);
    };
  }, [tabs, activeFileId]);

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width } = entry.contentRect;
      setGenerate((prev) => {
        return { ...prev, width };
      });
    }
  });

  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeFileId);
    const model = editorRef?.getModel();

    if (!editorRef || !tab || !model) return;

    const yDoc = new Y.Doc();
    const yText = yDoc.getText(tab.id);
    const yProvider: any = new LiveblocksProvider(room, yDoc);

    const onSync = (isSynced: boolean) => {
      if (isSynced) {
        const text = yText.toString();
        if (text === "") {
          if (activeFileContent) {
            yText.insert(0, activeFileContent);
          } else {
            setTimeout(() => {
              yText.insert(0, editorRef.getValue());
            }, 0);
          }
        }
      } else {
        // Yjs content is not synchronized
      }
    };

    yProvider.on("sync", onSync);

    setProvider(yProvider);

    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editorRef]),
      yProvider.awareness as Awareness
    );

    return () => {
      yDoc.destroy();
      yProvider.destroy();
      binding.destroy();
      yProvider.off("sync", onSync);
    };
  }, [editorRef, room, activeFileContent]);

  // connection/disconnection effect + resizeobserver
  useEffect(() => {
    socket.connect();

    if (editorContainerRef.current) {
      resizeObserver.observe(editorContainerRef.current);
    }

    return () => {
      socket.disconnect();

      resizeObserver.disconnect();
    };
  }, []);

  // event listener effect
  useEffect(() => {
    const onConnect = () => {
      console.log("connected");

      createTerminal();
    };

    const onDisconnect = () => {};

    const onLoadedEvent = (files: (TFolder | TFile)[]) => {
      setFiles(files);
    };

    const onRateLimit = (message: string) => {
      toast.error(message);
    };

    const onTerminalResponse = (response: { id: string; data: string }) => {
      const res = response.data;
      console.log("terminal response:", res);

      const term = terminals.find((t) => t.id === response.id);
      if (term && term.terminal) term.terminal.write(res);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("loaded", onLoadedEvent);
    socket.on("rateLimit", onRateLimit);
    socket.on("terminalResponse", onTerminalResponse);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("loaded", onLoadedEvent);
      socket.off("rateLimit", onRateLimit);
      socket.off("terminalResponse", onTerminalResponse);
    };
  }, []);

  // Helper functions:

  const createTerminal = () => {
    setCreatingTerminal(true);
    const id = createId();
    setActiveTerminalId(id);
    setTimeout(() => {
      socket.emit("createTerminal", id, (res: boolean) => {
        if (res) {
          setTerminals((prev) => [...prev, { id, terminal: null }]);
        }
      });
    }, 1000);
    setCreatingTerminal(false);
  };

  const selectFile = (tab: TTab) => {
    if (tab.id === activeFileId) return;
    const exists = tabs.find((t) => t.id === tab.id);

    setTabs((prev) => {
      if (exists) {
        setActiveFileId(exists.id);
        return prev;
      }
      return [...prev, tab];
    });

    socket.emit("getFile", tab.id, (response: string) => {
      setActiveFileContent(response);
    });
    setEditorLanguage(processFileType(tab.name));
    setActiveFileId(tab.id);
  };

  const closeTab = (tab: TFile) => {
    const numTabs = tabs.length;
    const index = tabs.findIndex((t) => t.id === tab.id);

    if (index === -1) return;

    const nextId =
      activeFileId === tab.id
        ? numTabs === 1
          ? null
          : index < numTabs - 1
          ? tabs[index + 1].id
          : tabs[index - 1].id
        : activeFileId;

    setTabs((prev) => prev.filter((t) => t.id !== tab.id));

    if (!nextId) {
      setActiveFileId("");
    } else {
      const nextTab = tabs.find((t) => t.id === nextId);
      if (nextTab) {
        selectFile(nextTab);
      }
    }
  };

  const closeTerminal = (term: { id: string; terminal: Terminal | null }) => {
    const numTerminals = terminals.length;
    const index = terminals.findIndex((t) => t.id === term.id);
    if (index === -1) return;

    socket.emit("closeTerminal", term.id, (res: boolean) => {
      if (res) {
        const nextId =
          activeTerminalId === term.id
            ? numTerminals === 1
              ? null
              : index < numTerminals - 1
              ? terminals[index + 1].id
              : terminals[index - 1].id
            : activeTerminalId;

        setTerminals((prev) => prev.filter((t) => t.id !== term.id));

        if (!nextId) {
          setActiveTerminalId("");
        } else {
          const nextTerminal = terminals.find((t) => t.id === nextId);
          if (nextTerminal) {
            setActiveTerminalId(nextTerminal.id);
          }
        }
      }
    });
  };

  const handleRename = (
    id: string,
    newName: string,
    oldName: string,
    type: "file" | "folder"
  ) => {
    const valid = validateName(newName, oldName, type);
    if (!valid.status) {
      if (valid.message) toast.error("Invalid file name.");
      return false;
    }

    socket.emit("renameFile", id, newName);
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, name: newName } : tab))
    );

    return true;
  };

  const handleDeleteFile = (file: TFile) => {
    socket.emit("deleteFile", file.id, (response: (TFolder | TFile)[]) => {
      setFiles(response);
    });
    closeTab(file);
  };

  const handleDeleteFolder = (folder: TFolder) => {
    // socket.emit("deleteFolder", folder.id, (response: (TFolder | TFile)[]) => {
    //   setFiles(response)
    // })
  };

  return (
    <>
      <div ref={generateRef} />
      <div className="z-50 p-1" ref={generateWidgetRef}>
        {generate.show && ai ? (
          <GenerateInput
            user={userData}
            socket={socket}
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
                changeAccessor.removeZone(generate.id);

                if (!generateRef.current) return;
                const id = changeAccessor.addZone({
                  afterLineNumber: cursorLine,
                  heightInLines: 12,
                  domNode: generateRef.current,
                });
                setGenerate((prev) => {
                  return { ...prev, id };
                });
              });
            }}
            onAccept={(code: string) => {
              const line = generate.line;
              setGenerate((prev) => {
                return {
                  ...prev,
                  show: !prev.show,
                };
              });
              const file = editorRef?.getValue();

              const lines = file?.split("\n") || [];
              lines.splice(line - 1, 0, code);
              const updatedFile = lines.join("\n");
              editorRef?.setValue(updatedFile);
            }}
          />
        ) : null}
      </div>

      <Sidebar
        files={files}
        selectFile={selectFile}
        handleRename={handleRename}
        handleDeleteFile={handleDeleteFile}
        handleDeleteFolder={handleDeleteFolder}
        socket={socket}
        addNew={(name, type) => {
          if (type === "file") {
            setFiles((prev) => [
              ...prev,
              { id: `projects/${sandboxData.id}/${name}`, name, type: "file" },
            ]);
          } else {
            console.log("adding folder");
            // setFiles(prev => [...prev, { id, name, type: "folder", children: [] }])
          }
        }}
        ai={ai}
        setAi={setAi}
      />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          className="p-2 flex flex-col"
          maxSize={75}
          minSize={30}
          defaultSize={60}
        >
          <div className="h-10 w-full flex gap-2 overflow-auto tab-scroll">
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                saved={tab.saved}
                selected={activeFileId === tab.id}
                onClick={(e) => {
                  selectFile(tab);
                }}
                onClose={() => closeTab(tab)}
              >
                {tab.name}
              </Tab>
            ))}
          </div>
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
            ) : clerk.loaded ? (
              <>
                {provider ? <Cursors yProvider={provider} /> : null}
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
                      );
                    } else {
                      setTabs((prev) =>
                        prev.map((tab) =>
                          tab.id === activeFileId
                            ? { ...tab, saved: false }
                            : tab
                        )
                      );
                    }
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
              {isOwner ? (
                <>
                  <div className="h-10 w-full overflow-auto flex gap-2 shrink-0 tab-scroll">
                    {terminals.map((term) => (
                      <Tab
                        key={term.id}
                        onClick={() => setActiveTerminalId(term.id)}
                        onClose={() => closeTerminal(term)}
                        selected={activeTerminalId === term.id}
                      >
                        <SquareTerminal className="w-4 h-4 mr-2" />
                        Shell
                      </Tab>
                    ))}
                    <Button
                      disabled={creatingTerminal}
                      onClick={() => {
                        if (terminals.length >= 4) {
                          toast.error(
                            "You reached the maximum # of terminals."
                          );
                          return;
                        }
                        createTerminal();
                      }}
                      size="smIcon"
                      variant={"secondary"}
                      className={`font-normal shrink-0 select-none text-muted-foreground`}
                    >
                      {creatingTerminal ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="w-full relative grow h-full overflow-hidden rounded-md bg-secondary">
                    {socket && activeTerminal ? (
                      <EditorTerminal
                        socket={socket}
                        id={activeTerminal.id}
                        term={activeTerminal.terminal}
                        setTerm={(t: Terminal) => {
                          setTerminals((prev) =>
                            prev.map((term) =>
                              term.id === activeTerminal.id
                                ? { ...term, terminal: t }
                                : term
                            )
                          );
                        }}
                      />
                    ) : null}
                  </div>
                </>
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
  );
}
