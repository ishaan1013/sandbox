import Navbar from "@/components/editor/navbar"
import { Sandbox, User } from "@/lib/types"
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

export default async function CodePage({ params }: { params: { id: string } }) {
  const user = await currentUser()
  const sandboxId = params.id

  if (!user) {
    redirect("/")
  }

  const userData = await getUserData(user.id)
  const sandboxData = await getSandboxData(sandboxId)

  return (
    <div className="overflow-hidden overscroll-none w-screen flex flex-col h-screen bg-background">
      <Navbar userData={userData} sandboxData={sandboxData} />
      <div className="w-screen flex grow">
        <CodeEditor userId={user.id} sandboxId={sandboxId} />
      </div>
    </div>
  )
}
