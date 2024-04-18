// DB Types

export type User = {
  id: string
  name: string
  email: string
}

export type Sandbox = {
  id: string
  name: string
  type: "react" | "node"
  bucket: string | null
  userId: string
}
