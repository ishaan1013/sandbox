import { User } from "@/lib/types"
import { currentUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"

export default async function AppAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user) {
    redirect("/")
  }

  const dbUser = await fetch(`http://localhost:8787/api/user?id=${user.id}`)
  const dbUserJSON = (await dbUser.json()) as User

  if (!dbUserJSON.id) {
    const res = await fetch("http://localhost:8787/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: user.id,
        name: user.firstName + " " + user.lastName,
        email: user.emailAddresses[0].emailAddress,
      }),
    })

    console.log(res)
  } else {
    // user already exists in db
  }

  return <>{children}</>
}
