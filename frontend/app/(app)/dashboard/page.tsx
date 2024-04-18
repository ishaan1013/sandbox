import { UserButton, currentUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import Dashboard from "@/components/dashboard"
import Navbar from "@/components/dashboard/navbar"
import { Sandbox } from "@/lib/types"

export default async function DashboardPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/")
  }

  const res = await fetch(
    `http://localhost:8787/api/user/sandbox?id=${user.id}`
  )
  const data = (await res.json()).sandbox as Sandbox[]

  console.log(data)

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden overscroll-none">
      <Navbar userId={user.id} />
      <Dashboard sandboxes={data} />
    </div>
  )
}
