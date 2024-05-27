import Navbar from "@/components/editor/navbar"
import { Room } from "@/components/editor/live/room"
import { Sandbox, User, UsersToSandboxes } from "@/lib/types"
import { currentUser } from "@clerk/nextjs"
import { notFound, redirect } from "next/navigation"
import Editor from "@/components/editor"
import Loading from "@/components/editor/loading"
import dynamic from "next/dynamic"

export const revalidate = 0

const getUserData = async (id: string) => {
  const userRes = await fetch(
    `${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/user?id=${id}`,
    {
      headers: {
        Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
      },
    }
  )
  const userData: User = await userRes.json()
  return userData
}

const getSandboxData = async (id: string) => {
  const sandboxRes = await fetch(
    `${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/sandbox?id=${id}`,
    {
      headers: {
        Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
      },
    }
  )
  const sandboxData: Sandbox = await sandboxRes.json()
  return sandboxData
}

const getSharedUsers = async (usersToSandboxes: UsersToSandboxes[]) => {
  if (!usersToSandboxes) {
    return []
  }

  const shared = await Promise.all(
    usersToSandboxes.map(async (user) => {
      const userRes = await fetch(
        `${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/user?id=${user.userId}`,
        {
          headers: {
            Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
          },
        }
      )
      const userData: User = await userRes.json()
      return { id: userData.id, name: userData.name }
    })
  )

  return shared
}

const CodeEditor = dynamic(() => import("@/components/editor"), {
  ssr: false,
  loading: () => <Loading />,
})

export default async function CodePage({ params }: { params: { id: string } }) {
  const user = await currentUser()
  const sandboxId = params.id

  if (!user) {
    redirect("/")
  }

  const userData = await getUserData(user.id)
  const sandboxData = await getSandboxData(sandboxId)
  const shared = await getSharedUsers(sandboxData.usersToSandboxes)

  const isOwner = sandboxData.userId === user.id
  const isSharedUser = shared.some((uts) => uts.id === user.id)

  if (!isOwner && !isSharedUser) {
    return notFound()
  }

  return (
    <div className="overflow-hidden overscroll-none w-screen flex flex-col h-screen bg-background">
      <Room id={sandboxId}>
        <Navbar userData={userData} sandboxData={sandboxData} shared={shared} />
        <div className="w-screen flex grow">
          <CodeEditor userData={userData} sandboxData={sandboxData} />
        </div>
      </Room>
    </div>
  )
}
