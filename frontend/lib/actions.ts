"use server"

import { revalidatePath } from "next/cache"

export async function createSandbox(body: {
  type: string
  name: string
  userId: string
  visibility: string
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/sandbox`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
      },
      body: JSON.stringify(body),
    }
  )

  return await res.text()
}

export async function updateSandbox(body: {
  id: string
  name?: string
  visibility?: "public" | "private"
}) {
  await fetch(`${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/sandbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
    },
    body: JSON.stringify(body),
  })

  revalidatePath("/dashboard")
}

export async function deleteSandbox(id: string) {
  await fetch(
    `${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/sandbox?id=${id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
      },
    }
  )

  revalidatePath("/dashboard")
}

export async function shareSandbox(sandboxId: string, email: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/sandbox/share`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
      },
      body: JSON.stringify({ sandboxId, email }),
    }
  )
  const text = await res.text()

  if (res.status !== 200) {
    return { success: false, message: text }
  }

  revalidatePath(`/code/${sandboxId}`)
  return { success: true, message: "Shared successfully." }
}

export async function unshareSandbox(sandboxId: string, userId: string) {
  await fetch(
    `${process.env.NEXT_PUBLIC_DATABASE_WORKER_URL}/api/sandbox/share`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${process.env.NEXT_PUBLIC_WORKERS_KEY}`,
      },
      body: JSON.stringify({ sandboxId, userId }),
    }
  )

  revalidatePath(`/code/${sandboxId}`)
}
