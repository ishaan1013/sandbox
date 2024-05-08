"use client";

import { FilePlus, FolderPlus, Loader2, Search, Sparkles } from "lucide-react";
import SidebarFile from "./file";
import SidebarFolder from "./folder";
import { TFile, TFolder, TTab } from "@/lib/types";
import { useState } from "react";
import New from "./new";
import { Socket } from "socket.io-client";
import Button from "@/components/ui/customButton";
import { Switch } from "@/components/ui/switch";

export default function Sidebar({
  files,
  selectFile,
  handleRename,
  handleDeleteFile,
  handleDeleteFolder,
  socket,
  addNew,
  ai,
  setAi,
}: {
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
  addNew: (name: string, type: "file" | "folder") => void;
  ai: boolean;
  setAi: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [creatingNew, setCreatingNew] = useState<"file" | "folder" | null>(
    null
  );

  return (
    <div className="h-full w-56 select-none flex flex-col text-sm items-start justify-between p-2">
      <div className="w-full flex flex-col items-start">
        <div className="flex w-full items-center justify-between h-8 mb-1 ">
          <div className="text-muted-foreground">Explorer</div>
          <div className="flex space-x-1">
            <button
              onClick={() => setCreatingNew("file")}
              className="h-6 w-6 text-muted-foreground ml-0.5 flex items-center justify-center translate-x-1 bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <FilePlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCreatingNew("folder")}
              className="h-6 w-6 text-muted-foreground ml-0.5 flex items-center justify-center translate-x-1 bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            {/* Todo: Implement file searching */}
            {/* <button className="h-6 w-6 text-muted-foreground ml-0.5 flex items-center justify-center translate-x-1 bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <Search className="w-4 h-4" />
          </button> */}
          </div>
        </div>
        <div className="w-full mt-1 flex flex-col">
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
                  />
                ) : (
                  <SidebarFolder
                    key={child.id}
                    data={child}
                    selectFile={selectFile}
                    handleRename={handleRename}
                    handleDeleteFile={handleDeleteFile}
                    handleDeleteFolder={handleDeleteFolder}
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
    </div>
  );
}
