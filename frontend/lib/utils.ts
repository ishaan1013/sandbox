import { type ClassValue, clsx } from "clsx"
import { toast } from "sonner"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function processFileType(file: string) {
  const ending = file.split(".").pop()

  if (ending === "ts" || ending === "tsx") return "typescript"
  if (ending === "js" || ending === "jsx") return "javascript"

  if (ending) return ending
  return "plaintext"
}

export function validateName(
  newName: string,
  oldName: string,
  type: "file" | "folder"
) {
  if (newName === oldName || newName.length === 0) {
    return false
  }

  if (
    newName.includes("/") ||
    newName.includes("\\") ||
    newName.includes(" ") ||
    (type === "file" && !newName.includes(".")) ||
    (type === "folder" && newName.includes("."))
  ) {
    toast.error("Invalid file name.")
    return false
  }
  return true
}
