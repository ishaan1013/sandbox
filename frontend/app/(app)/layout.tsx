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

  const dbUser = await fetch(
    `${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/user?id=${user.id}`,
    {
      headers: {
        Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
      },
    }
  )
  const dbUserJSON = (await dbUser.json()) as User

  if (!dbUserJSON.id) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
        },
        body: JSON.stringify({
          id: user.id,
          name: user.firstName + " " + user.lastName,
          email: user.emailAddresses[0].emailAddress,
        }),
      }
    )
  }

  return <>{children}</>
}
