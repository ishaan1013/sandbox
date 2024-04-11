import { FilePlus, FolderPlus, Search } from "lucide-react"
import SidebarFile from "./file"
import SidebarFolder from "./folder"
import { TFile, TFolder } from "./types"

const data: (TFile | TFolder)[] = [
  {
    id: "index.tsx",
    type: "file",
    name: "index.tsx",
  },
  {
    id: "components",
    type: "folder",
    name: "components",
    children: [
      {
        id: "navbar.tsx",
        type: "file",
        name: "navbar.tsx",
      },
      {
        id: "ui",
        type: "folder",
        name: "ui",
        children: [
          {
            id: "Button.tsx",
            type: "file",
            name: "Button.tsx",
          },
          {
            id: "Input.tsx",
            type: "file",
            name: "Input.tsx",
          },
        ],
      },
    ],
  },
  {
    id: "App.tsx",
    type: "file",
    name: "App.tsx",
  },
  {
    id: "styles",
    type: "folder",
    name: "styles",
    children: [
      {
        id: "style.css",
        type: "file",
        name: "style.css",
      },
      {
        id: "index.css",
        type: "file",
        name: "index.css",
      },
    ],
  },
]

export default function Sidebar() {
  return (
    <div className="h-full w-56 select-none flex flex-col text-sm items-start p-2">
      <div className="flex w-full items-center justify-between h-8 mb-1 ">
        <div className="text-muted-foreground">EXPLORER</div>
        <div className="flex space-x-1">
          <div className="h-6 w-6 text-muted-foreground ml-0.5 flex items-center justify-center translate-x-1 transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm">
            <FilePlus className="w-4 h-4" />
          </div>
          <div className="h-6 w-6 text-muted-foreground ml-0.5 flex items-center justify-center translate-x-1 transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm">
            <FolderPlus className="w-4 h-4" />
          </div>
          <div className="h-6 w-6 text-muted-foreground ml-0.5 flex items-center justify-center translate-x-1 transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </div>
      <div className="w-full mt-1 flex flex-col">
        {/* <SidebarFile name="index.tsx" />
        <SidebarFolder name="styles" /> */}
        {data.map((child) =>
          child.type === "file" ? (
            <SidebarFile key={child.id} data={child} />
          ) : (
            <SidebarFolder key={child.id} data={child} />
          )
        )}
      </div>
    </div>
  )
}
