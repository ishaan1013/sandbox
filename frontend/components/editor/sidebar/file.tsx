"use client"

import Image from "next/image"
import { getIconForFile } from "vscode-icons-js"
import { TFile } from "./types"

export default function SidebarFile({ data }: { data: TFile }) {
  return (
    <div className="w-full flex items-center h-7 px-1 transition-colors hover:bg-secondary rounded-sm cursor-pointer">
      <Image
        src={`/icons/${getIconForFile(data.name)}`}
        alt="File Icon"
        width={18}
        height={18}
        className="mr-2"
      />
      {data.name}
    </div>
  )
}
