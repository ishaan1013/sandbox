import { UserButton, currentUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import Dashboard from "@/components/dashboard"
import Navbar from "@/components/dashboard/navbar"

export default async function DashboardPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/")
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden overscroll-none">
      <Navbar />
      <Dashboard />
    </div>
  )
}
