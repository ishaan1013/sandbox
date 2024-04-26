// DB Types

export type User = {
  id: string
  name: string
  email: string
  sandbox: Sandbox[]
}

export type Sandbox = {
  id: string
  name: string
  type: "react" | "node"
  init: boolean
  bucket: string | null
  userId: string
}

export type R2Files = {
  objects: R2FileData[]
  truncated: boolean
  delimitedPrefixes: any[]
}

export type R2FileData = {
  storageClass: string
  uploaded: string
  checksums: any
  httpEtag: string
  etag: string
  size: number
  version: string
  key: string
}
