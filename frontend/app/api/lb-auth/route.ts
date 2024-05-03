import { User } from "@/lib/types"
import { currentUser } from "@clerk/nextjs"
import { Liveblocks } from "@liveblocks/node"
import { NextRequest } from "next/server"

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY!

const liveblocks = new Liveblocks({
  secret: API_KEY!,
})

export async function POST(request: NextRequest) {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return new Response("Unauthorized", { status: 401 })
  }

  const res = await fetch(`http://localhost:8787/api/user?id=${clerkUser.id}`)
  const user = (await res.json()) as User

  // Create a session for the current user
  // userInfo is made available in Liveblocks presence hooks, e.g. useOthers
  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  })

  // Give the user access to the room
  user.sandbox.forEach((sandbox) => {
    session.allow(`${sandbox.id}`, session.FULL_ACCESS)
  })
  user.usersToSandboxes.forEach((userToSandbox) => {
    session.allow(`${userToSandbox.sandboxId}`, session.FULL_ACCESS)
  })

  // Authorize the user and return the result
  const { body, status } = await session.authorize()
  return new Response(body, { status })
}
