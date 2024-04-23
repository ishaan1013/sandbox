"use server"

export async function createSandbox(body: {
  type: string
  name: string
  visibility: string
}) {
  const res = await fetch("http://localhost:8787/api/sandbox/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}
