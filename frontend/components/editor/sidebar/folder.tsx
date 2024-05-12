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
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

// Note: Renaming has not been implemented in the backend yet, so UI relating to renaming is commented out

export default function SidebarFolder({
  data,
  selectFile,
  handleRename,
  handleDeleteFile,
  handleDeleteFolder,
  movingId,
  deletingFolderId,
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
  deletingFolderId: string;
}) {
  const ref = useRef(null); // drop target
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  const isDeleting =
    deletingFolderId.length > 0 && data.id.startsWith(deletingFolderId);

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

        // no dropping while awaiting move
        canDrop: () => {
          return !movingId;
        },
      });
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const folder = isOpen
    ? getIconForOpenFolder(data.name)
    : getIconForFolder(data.name);

  const inputRef = useRef<HTMLInputElement>(null);
  // const [editing, setEditing] = useState(false);

  // useEffect(() => {
  //   if (editing) {
  //     inputRef.current?.focus();
  //   }
  // }, [editing]);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={ref}
        disabled={isDeleting}
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
        {isDeleting ? (
          <>
            <div className="text-muted-foreground animate-pulse">
              Deleting...
            </div>
          </>
        ) : (
          <form
          // onSubmit={(e) => {
          //   e.preventDefault();
          //   setEditing(false);
          // }}
          >
            <input
              ref={inputRef}
              disabled
              className={`pointer-events-none bg-transparent transition-all focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-ring rounded-sm w-full`}
              defaultValue={data.name}
            />
            {/* <input
            ref={inputRef}
            className={`bg-transparent transition-all focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-ring rounded-sm w-full ${
              editing ? "" : "pointer-events-none"
            }`}
            disabled={!editing}
            defaultValue={data.name}
            onBlur={() => {
              setEditing(false);
            }}
          /> */}
          </form>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          disabled
          // onClick={() => {
          //   setEditing(true);
          // }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          disabled={isDeleting}
          onClick={() => {
            handleDeleteFolder(data);
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
          </div>
        </div>
      ) : null}
    </ContextMenu>
  );
}
