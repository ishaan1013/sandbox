import Navbar from "@/components/editor/navbar"
import { TFile, TFolder } from "@/components/editor/sidebar/types"
import { R2Files, User } from "@/lib/types"
import { currentUser } from "@clerk/nextjs"
import dynamic from "next/dynamic"
import { notFound, redirect } from "next/navigation"

const CodeEditor = dynamic(() => import("@/components/editor"), {
  ssr: false,
})

const getUserData = async (id: string) => {
  const userRes = await fetch(`http://localhost:8787/api/user?id=${id}`)
  const userData: User = await userRes.json()
  return userData
}

const getSandboxFiles = async (id: string) => {
  const sandboxRes = await fetch(
    `https://storage.ishaan1013.workers.dev/api?sandboxId=${id}`
  )
  const sandboxData: R2Files = await sandboxRes.json()

  if (sandboxData.objects.length === 0) return notFound()
  const paths = sandboxData.objects.map((obj) => obj.key)
  return processFiles(paths, id)
}

const processFiles = (paths: string[], id: string): (TFile | TFolder)[] => {
  const root: TFolder = { id: "/", type: "folder", name: "/", children: [] }

  paths.forEach((path) => {
    const allParts = path.split("/")
    if (allParts[1] !== id) return notFound()

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

export default async function CodePage({ params }: { params: { id: string } }) {
  const user = await currentUser()
  const sandboxId = params.id

  if (!user) {
    redirect("/")
  }

  const userData = await getUserData(user.id)
  const sandboxFiles = await getSandboxFiles(sandboxId)

  return (
    <div className="overflow-hidden overscroll-none w-screen flex flex-col h-screen bg-background">
      <Navbar userData={userData} />
      <div className="w-screen flex grow">
        <CodeEditor files={sandboxFiles} />
      </div>
    </div>
  )
}
