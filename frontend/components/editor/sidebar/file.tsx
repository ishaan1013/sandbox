"use client"

import Image from "next/image"
import { getIconForFile } from "vscode-icons-js"
import { TFile, TTab } from "./types"
import { useEffect, useRef, useState } from "react"

export default function SidebarFile({
  data,
  selectFile,
}: {
  data: TFile
  selectFile: (file: TTab) => void
}) {
  const [imgSrc, setImgSrc] = useState(`/icons/${getIconForFile(data.name)}`)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])

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
          console.log("submit")
          setEditing(false)
        }}
      >
        <input
          ref={inputRef}
          className={`bg-transparent w-full ${
            editing ? "" : "pointer-events-none"
          }`}
          disabled={!editing}
          defaultValue={data.name}
          onBlur={() => setEditing(false)}
        />
      </form>
    </button>
  )
}
