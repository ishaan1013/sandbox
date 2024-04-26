"use client"

import Image from "next/image"
import { getIconForFile } from "vscode-icons-js"
import { TFile } from "./types"
import { useEffect, useState } from "react"

export default function SidebarFile({
  data,
  selectFile,
}: {
  data: TFile
  selectFile: (file: TFile) => void
}) {
  const [imgSrc, setImgSrc] = useState(`/icons/${getIconForFile(data.name)}`)

  return (
    <button
      onClick={() => selectFile(data)}
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
      {data.name}
    </button>
  )
}
