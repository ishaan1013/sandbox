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

  const dbUser = await fetch(`http://localhost:8787/user?id=${user.id}`)
  // const dbUserJSON = await dbUser.json()

  console.log(dbUser)

  // if (!dbUserJSON) {
  //   const res = await fetch("http://localhost:8787/user", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       id: user.id,
  //       email: user.emailAddresses[0].emailAddress,
  //     }),
  //   })
  // }

  return <>{children}</>
}
