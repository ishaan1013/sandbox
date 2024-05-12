"use client";

import {
  FilePlus,
  FolderPlus,
  Loader2,
  MonitorPlay,
  Search,
  Sparkles,
} from "lucide-react";
import SidebarFile from "./file";
import SidebarFolder from "./folder";
import { Sandbox, TFile, TFolder, TTab } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import New from "./new";
import { Socket } from "socket.io-client";
import { Switch } from "@/components/ui/switch";

import {
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import Button from "@/components/ui/customButton";

export default function Sidebar({
  sandboxData,
  files,
  selectFile,
  handleRename,
  handleDeleteFile,
  handleDeleteFolder,
  socket,
  setFiles,
  addNew,
  ai,
  setAi,
  deletingFolderId,
}: {
  sandboxData: Sandbox;
  files: (TFile | TFolder)[];
  selectFile: (tab: TTab) => void;
  handleRename: (
    id: string,
    newName: string,
    oldName: string,
    type: "file" | "folder"
  ) => boolean;
  handleDeleteFile: (file: TFile) => void;
  handleDeleteFolder: (folder: TFolder) => void;
  socket: Socket;
  setFiles: (files: (TFile | TFolder)[]) => void;
  addNew: (name: string, type: "file" | "folder") => void;
  ai: boolean;
  setAi: React.Dispatch<React.SetStateAction<boolean>>;
  deletingFolderId: string;
}) {
  const ref = useRef(null); // drop target

  const [creatingNew, setCreatingNew] = useState<"file" | "folder" | null>(
    null
  );
  const [movingId, setMovingId] = useState("");

  useEffect(() => {
    const el = ref.current;

    if (el) {
      return dropTargetForElements({
        element: el,
        getData: () => ({ id: `projects/${sandboxData.id}` }),
        canDrop: ({ source }) => {
          const file = files.find((child) => child.id === source.data.id);
          return !file;
        },
      });
    }
  }, [files]);

  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0];
        if (!destination) {
          return;
        }

        const fileId = source.data.id as string;
        const folderId = destination.data.id as string;

        const fileFolder = fileId.split("/").slice(0, -1).join("/");
        if (fileFolder === folderId) {
          return;
        }

        console.log("move file", fileId, "to folder", folderId);

        setMovingId(fileId);
        socket.emit(
          "moveFile",
          fileId,
          folderId,
          (response: (TFolder | TFile)[]) => {
            setFiles(response);
            setMovingId("");
          }
        );
      },
    });
  }, []);

  return (
    <div className="h-full w-56 select-none flex flex-col text-sm items-start justify-between p-2">
      <div className="w-full flex flex-col items-start">
        <div className="flex w-full items-center justify-between h-8 mb-1 ">
          <div className="text-muted-foreground">Explorer</div>
          <div className="flex space-x-1">
            <button
              disabled={!!creatingNew}
              onClick={() => setCreatingNew("file")}
              className="h-6 w-6 text-muted-foreground ml-0.5 flex items-center justify-center translate-x-1 bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:hover:bg-background"
            >
              <FilePlus className="w-4 h-4" />
            </button>
            <button
              disabled={!!creatingNew}
              onClick={() => setCreatingNew("folder")}
              className="h-6 w-6 text-muted-foreground ml-0.5 flex items-center justify-center translate-x-1 bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:hover:bg-background"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            {/* Todo: Implement file searching */}
            {/* <button className="h-6 w-6 text-muted-foreground ml-0.5 flex items-center justify-center translate-x-1 bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <Search className="w-4 h-4" />
          </button> */}
          </div>
        </div>
        <div ref={ref} className="rounded-sm w-full mt-1 flex flex-col">
          {/* <div
          ref={ref}
          className={`${
            isDraggedOver ? "bg-secondary/50" : ""
          } rounded-sm w-full mt-1 flex flex-col`}
        > */}
          {files.length === 0 ? (
            <div className="w-full flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <>
              {files.map((child) =>
                child.type === "file" ? (
                  <SidebarFile
                    key={child.id}
                    data={child}
                    selectFile={selectFile}
                    handleRename={handleRename}
                    handleDeleteFile={handleDeleteFile}
                    movingId={movingId}
                    deletingFolderId={deletingFolderId}
                  />
                ) : (
                  <SidebarFolder
                    key={child.id}
                    data={child}
                    selectFile={selectFile}
                    handleRename={handleRename}
                    handleDeleteFile={handleDeleteFile}
                    handleDeleteFolder={handleDeleteFolder}
                    movingId={movingId}
                    deletingFolderId={deletingFolderId}
                  />
                )
              )}
              {creatingNew !== null ? (
                <New
                  socket={socket}
                  type={creatingNew}
                  stopEditing={() => {
                    setCreatingNew(null);
                  }}
                  addNew={addNew}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <Sparkles
              className={`h-4 w-4 mr-2 ${
                ai ? "text-indigo-500" : "text-muted-foreground"
              }`}
            />
            Copilot{" "}
            <span className="font-mono text-muted-foreground inline-block ml-1.5 text-xs leading-none border border-b-2 border-muted-foreground py-1 px-1.5 rounded-md">
              ⌘G
            </span>
          </div>
          <Switch checked={ai} onCheckedChange={setAi} />
        </div>
        <Button className="w-full">
          <MonitorPlay className="w-4 h-4 mr-2" /> Run
        </Button>
      </div>
    </div>
  );
}
