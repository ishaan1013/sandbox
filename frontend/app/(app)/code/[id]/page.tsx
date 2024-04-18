import Navbar from "@/components/editor/navbar"
import { User } from "@/lib/types"
import { currentUser } from "@clerk/nextjs"
import dynamic from "next/dynamic"
import { redirect } from "next/navigation"

const CodeEditor = dynamic(() => import("@/components/editor"), {
  ssr: false,
})

export default async function CodePage() {
  const user = await currentUser()

  if (!user) {
    redirect("/")
  }

  const userRes = await fetch(`http://localhost:8787/api/user?id=${user.id}`)
  const userData = (await userRes.json()) as User

  return (
    <div className="overflow-hidden overscroll-none w-screen flex flex-col h-screen bg-background">
      <Navbar userData={userData} />
      <div className="w-screen flex grow">
        <CodeEditor />
      </div>
    </div>
  )
}
