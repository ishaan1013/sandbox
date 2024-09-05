import { type ClassValue, clsx } from "clsx"
// import { toast } from "sonner"
import { twMerge } from "tailwind-merge"
import { Sandbox, TFile, TFolder } from "./types"
import fileExtToLang from "./file-extension-to-language.json"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function processFileType(file: string) {
  const extension = file.split(".").pop()
  const fileExtToLangMap = fileExtToLang as Record<string, string>
  if (extension && fileExtToLangMap[extension]) {
    return fileExtToLangMap[extension]
  }

  return "plaintext"
}

export function validateName(
  newName: string,
  oldName: string,
  type: "file" | "folder"
) {
  if (newName === oldName || newName.length === 0) {
    return { status: false, message: "" }
  }
  if (
    newName.includes("/") ||
    newName.includes("\\") ||
    newName.includes(" ") ||
    (type === "file" && !newName.includes(".")) ||
    (type === "folder" && newName.includes("."))
  ) {
    return { status: false, message: "Invalid file name." }
  }
  return { status: true, message: "" }
}

export function addNew(
  name: string,
  type: "file" | "folder",
  setFiles: React.Dispatch<React.SetStateAction<(TFolder | TFile)[]>>,
  sandboxData: Sandbox
) {
  if (type === "file") {
    setFiles((prev) => [
      ...prev,
      { id: `projects/${sandboxData.id}/${name}`, name, type: "file" },
    ])
  } else {
    console.log("adding folder")
    setFiles((prev) => [
      ...prev,
      {
        id: `projects/${sandboxData.id}/${name}`,
        name,
        type: "folder",
        children: [],
      },
    ])
  }
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout | null = null
  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  } as T
}
