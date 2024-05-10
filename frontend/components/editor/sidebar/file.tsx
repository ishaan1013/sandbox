"use client";

import Image from "next/image";
import { getIconForFile } from "vscode-icons-js";
import { TFile, TTab } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

export default function SidebarFile({
  data,
  selectFile,
  handleRename,
  handleDeleteFile,
  movingId,
}: {
  data: TFile;
  selectFile: (file: TTab) => void;
  handleRename: (
    id: string,
    newName: string,
    oldName: string,
    type: "file" | "folder"
  ) => boolean;
  handleDeleteFile: (file: TFile) => void;
  movingId: string;
}) {
  const isMoving = movingId === data.id;

  const ref = useRef(null); // for draggable
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [imgSrc, setImgSrc] = useState(`/icons/${getIconForFile(data.name)}`);
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    const el = ref.current;

    if (el)
      return draggable({
        element: el,
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
        getInitialData: () => ({ id: data.id }),
      });
  }, []);

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, inputRef.current]);

  const renameFile = () => {
    const renamed = handleRename(
      data.id,
      inputRef.current?.value ?? data.name,
      data.name,
      "file"
    );
    if (!renamed && inputRef.current) {
      inputRef.current.value = data.name;
    }
    setEditing(false);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={ref}
        disabled={pendingDelete || dragging || isMoving}
        onClick={() => {
          if (!editing && !pendingDelete && !isMoving)
            selectFile({ ...data, saved: true });
        }}
        // onDoubleClick={() => {
        //   setEditing(true)
        // }}
        className={`${
          dragging ? "opacity-50 hover:!bg-background" : ""
        } data-[state=open]:bg-secondary/50 w-full flex items-center h-7 px-1 hover:bg-secondary rounded-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
      >
        <Image
          src={imgSrc}
          alt="File Icon"
          width={18}
          height={18}
          className="mr-2"
          onError={() => setImgSrc("/icons/default_file.svg")}
        />
        {isMoving ? (
          <>
            <Loader2 className="text-muted-foreground w-4 h-4 animate-spin mr-2" />
            <div className="text-muted-foreground">{data.name}</div>
          </>
        ) : pendingDelete ? (
          <>
            <Loader2 className="text-muted-foreground w-4 h-4 animate-spin mr-2" />
            <div className="text-muted-foreground">Deleting...</div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              renameFile();
            }}
          >
            <input
              ref={inputRef}
              className={`bg-transparent transition-all focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-ring rounded-sm w-full ${
                editing ? "" : "pointer-events-none"
              }`}
              disabled={!editing}
              defaultValue={data.name}
              onBlur={() => renameFile()}
            />
          </form>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            console.log("rename");
            setEditing(true);
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          disabled={pendingDelete}
          onClick={() => {
            console.log("delete");
            setPendingDelete(true);
            handleDeleteFile(data);
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
