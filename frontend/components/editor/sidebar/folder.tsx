"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getIconForFolder, getIconForOpenFolder } from "vscode-icons-js";
import { TFile, TFolder, TTab } from "@/lib/types";
import SidebarFile from "./file";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Pencil, Trash2 } from "lucide-react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

export default function SidebarFolder({
  data,
  selectFile,
  handleRename,
  handleDeleteFile,
  handleDeleteFolder,
  movingId,
}: {
  data: TFolder;
  selectFile: (file: TTab) => void;
  handleRename: (
    id: string,
    newName: string,
    oldName: string,
    type: "file" | "folder"
  ) => boolean;
  handleDeleteFile: (file: TFile) => void;
  handleDeleteFolder: (folder: TFolder) => void;
  movingId: string;
}) {
  const ref = useRef(null); // drop target
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const el = ref.current;

    if (el)
      return dropTargetForElements({
        element: el,
        onDragEnter: () => setIsDraggedOver(true),
        onDragLeave: () => setIsDraggedOver(false),
        onDrop: () => setIsDraggedOver(false),
        getData: () => ({ id: data.id }),

        // Commented out to avoid propagating drop event downwards
        // Todo: Make this logic more elegant, the current implementation is just checking at the end in index.tsx

        // canDrop: ({ source }) => {
        //   const file = data.children.find(
        //     (child) => child.id === source.data.id
        //   );
        //   return !file;
        // },

        canDrop: () => {
          return !movingId;
        }, // no dropping while awaiting move
      });
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const folder = isOpen
    ? getIconForOpenFolder(data.name)
    : getIconForFolder(data.name);

  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  // return (
  //   <div
  //     ref={ref}
  //     className="w-full h-7 rounded-full"
  //     style={{backgroundColor: isDraggedOver ? "red" : "blue"}}
  //   >
  //   </div>
  // )

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={ref}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${
          isDraggedOver ? "bg-secondary/50 rounded-t-sm" : "rounded-sm"
        } w-full flex items-center h-7 px-1 transition-colors hover:bg-secondary cursor-pointer`}
      >
        <Image
          src={`/icons/${folder}`}
          alt="Folder icon"
          width={18}
          height={18}
          className="mr-2"
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
          }}
        >
          <input
            ref={inputRef}
            className={`bg-transparent transition-all focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-ring rounded-sm w-full ${
              editing ? "" : "pointer-events-none"
            }`}
            disabled={!editing}
            defaultValue={data.name}
            onBlur={() => {
              setEditing(false);
            }}
          />
        </form>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            setEditing(true);
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          // disabled={pendingDelete}
          onClick={() => {
            console.log("delete");
            // setPendingDelete(true)
            // handleDeleteFile(data)
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
      {isOpen ? (
        <div
          className={`flex w-full items-stretch ${
            isDraggedOver ? "rounded-b-sm bg-secondary/50" : ""
          }`}
        >
          <div className="w-[1px] bg-border mx-2 h-full"></div>
          <div className="flex flex-col grow">
            {data.children.map((child) =>
              child.type === "file" ? (
                <SidebarFile
                  key={child.id}
                  data={child}
                  selectFile={selectFile}
                  handleRename={handleRename}
                  handleDeleteFile={handleDeleteFile}
                  movingId={movingId}
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
                />
              )
            )}
          </div>
        </div>
      ) : null}
    </ContextMenu>
  );
}
