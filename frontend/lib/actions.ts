"use server"

import { revalidatePath } from "next/cache"

export async function createSandbox(body: {
  type: string
  name: string
  userId: string
  visibility: string
}) {
  const res = await fetch("http://localhost:8787/api/sandbox", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  return await res.text()
}

export async function updateSandbox(body: {
  id: string
  name?: string
  visibility?: "public" | "private"
}) {
  const res = await fetch("http://localhost:8787/api/sandbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  revalidatePath("/dashboard")
}

export async function deleteSandbox(id: string) {
  const res = await fetch(`http://localhost:8787/api/sandbox?id=${id}`, {
    method: "DELETE",
  })

  revalidatePath("/dashboard")
}

export async function shareSandbox(sandboxId: string, email: string) {
  try {
    const res = await fetch("http://localhost:8787/api/sandbox/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sandboxId, email }),
    })

    revalidatePath(`/code/${sandboxId}`)
    return true
  } catch (err) {
    return false
  }
}
