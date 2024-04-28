"use client"

import Image from "next/image"
import { getIconForFile } from "vscode-icons-js"
import { TFile, TTab } from "./types"
import { useEffect, useRef, useState } from "react"

export default function SidebarFile({
  data,
  selectFile,
  handleRename,
}: {
  data: TFile
  selectFile: (file: TTab) => void
  handleRename: (
    id: string,
    newName: string,
    oldName: string,
    type: "file" | "folder"
  ) => boolean
}) {
  const [imgSrc, setImgSrc] = useState(`/icons/${getIconForFile(data.name)}`)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])

  const renameFile = () => {
    const renamed = handleRename(
      data.id,
      inputRef.current?.value ?? data.name,
      data.name,
      "file"
    )
    if (!renamed && inputRef.current) {
      inputRef.current.value = data.name
    }
    setEditing(false)
  }

  return (
    <button
      onClick={() => selectFile({ ...data, saved: true })}
      onDoubleClick={() => {
        setEditing(true)
      }}
      className="w-full flex items-center h-7 px-1 hover:bg-secondary rounded-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Image
        src={imgSrc}
        alt="File Icon"
        width={18}
        height={18}
        className="mr-2"
        onError={() => setImgSrc("/icons/default_file.svg")}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          renameFile()
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
    </button>
  )
}
