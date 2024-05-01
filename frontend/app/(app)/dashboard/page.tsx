import { UserButton, currentUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import Dashboard from "@/components/dashboard"
import Navbar from "@/components/dashboard/navbar"
import { Sandbox, User } from "@/lib/types"

export default async function DashboardPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/")
  }

  const userRes = await fetch(`http://localhost:8787/api/user?id=${user.id}`)
  const userData = (await userRes.json()) as User

  const sharedRes = await fetch(
    `http://localhost:8787/api/sandbox/share?id=${user.id}`
  )
  const shared = (await sharedRes.json()) as {
    id: string
    name: string
    type: "react" | "node"
    author: string
    sharedOn: Date
  }[]

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden overscroll-none">
      <Navbar userData={userData} />
      <Dashboard sandboxes={userData.sandbox} shared={shared} />
    </div>
  )
}
