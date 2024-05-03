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
  const res = await fetch("http://localhost:8787/api/sandbox/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, email }),
  })
  const text = await res.text()

  if (res.status !== 200) {
    return { success: false, message: text }
  }

  revalidatePath(`/code/${sandboxId}`)
  return { success: true, message: "Shared successfully." }
}

export async function unshareSandbox(sandboxId: string, userId: string) {
  const res = await fetch("http://localhost:8787/api/sandbox/share", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, userId }),
  })

  revalidatePath(`/code/${sandboxId}`)
}

export async function generateCode(code: string, line: number) {
  const res = await fetch(
    "https://api.cloudflare.com/client/v4/accounts/d18f2f848da38e37adc9a34eab3d5ae2/ai/run/@cf/meta/llama-3-8b-instruct",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are an expert coding assistant who reads from an existing code file, and suggests code to add to the file.",
          },
          {
            role: "user",
            content: "", //todo
          },
        ],
      }),
    }
  )
}
