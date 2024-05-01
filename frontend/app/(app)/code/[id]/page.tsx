import Navbar from "@/components/editor/navbar"
import { Sandbox, User, UsersToSandboxes } from "@/lib/types"
import { currentUser } from "@clerk/nextjs"
import dynamic from "next/dynamic"
import { redirect } from "next/navigation"

const CodeEditor = dynamic(() => import("@/components/editor"), {
  ssr: false,
})

const getUserData = async (id: string) => {
  const userRes = await fetch(`http://localhost:8787/api/user?id=${id}`)
  const userData: User = await userRes.json()
  return userData
}

const getSandboxData = async (id: string) => {
  const sandboxRes = await fetch(`http://localhost:8787/api/sandbox?id=${id}`)
  const sandboxData: Sandbox = await sandboxRes.json()
  return sandboxData
}

const getSharedUsers = async (usersToSandboxes: UsersToSandboxes[]) => {
  const shared = await Promise.all(
    usersToSandboxes.map(async (user) => {
      const userRes = await fetch(
        `http://localhost:8787/api/user?id=${user.userId}`
      )
      const userData: User = await userRes.json()
      return { id: userData.id, name: userData.name }
    })
  )

  return shared
}

export default async function CodePage({ params }: { params: { id: string } }) {
  const user = await currentUser()
  const sandboxId = params.id

  if (!user) {
    redirect("/")
  }

  const userData = await getUserData(user.id)
  const sandboxData = await getSandboxData(sandboxId)
  const shared = await getSharedUsers(sandboxData.usersToSandboxes)

  return (
    <div className="overflow-hidden overscroll-none w-screen flex flex-col h-screen bg-background">
      <Navbar userData={userData} sandboxData={sandboxData} shared={shared} />
      <div className="w-screen flex grow">
        <CodeEditor userData={userData} sandboxId={sandboxId} />
      </div>
    </div>
  )
}
