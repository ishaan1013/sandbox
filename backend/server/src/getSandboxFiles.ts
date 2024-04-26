import { R2Files, Sandbox, TFile, TFolder, User } from "./types"

const getSandboxFiles = async (id: string) => {
  const sandboxRes = await fetch(
    `https://storage.ishaan1013.workers.dev/api?sandboxId=${id}`
  )
  const sandboxData: R2Files = await sandboxRes.json()

  const paths = sandboxData.objects.map((obj) => obj.key)
  return processFiles(paths, id)
}

const processFiles = (paths: string[], id: string): (TFile | TFolder)[] => {
  const root: TFolder = { id: "/", type: "folder", name: "/", children: [] }

  paths.forEach((path) => {
    const allParts = path.split("/")
    if (allParts[1] !== id) {
      console.log("invalid path!!!!")
      return
    }

    const parts = allParts.slice(2)
    let current: TFolder = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1 && part.includes(".")
      const existing = current.children.find((child) => child.name === part)

      if (existing) {
        if (!isFile) {
          current = existing as TFolder
        }
      } else {
        if (isFile) {
          const file: TFile = { id: path, type: "file", name: part }
          current.children.push(file)
        } else {
          const folder: TFolder = {
            id: path,
            type: "folder",
            name: part,
            children: [],
          }
          current.children.push(folder)
          current = folder
        }
      }
    }
  })

  return root.children
}

export default getSandboxFiles
