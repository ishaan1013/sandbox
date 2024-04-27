import express, { Express, NextFunction, Request, Response } from "express"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"

import { z } from "zod"
import { User } from "./types"
import { getSandboxFiles, renameFile } from "./utils"

dotenv.config()

const app: Express = express()
const port = process.env.PORT || 4000
// app.use(cors())
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
})

const handshakeSchema = z.object({
  userId: z.string(),
  sandboxId: z.string(),
  EIO: z.string(),
  transport: z.string(),
})

io.use(async (socket, next) => {
  const q = socket.handshake.query
  const parseQuery = handshakeSchema.safeParse(q)

  if (!parseQuery.success) {
    console.log("Invalid request.")
    next(new Error("Invalid request."))
    return
  }

  const { sandboxId, userId } = parseQuery.data
  const dbUser = await fetch(`http://localhost:8787/api/user?id=${userId}`)
  const dbUserJSON = (await dbUser.json()) as User

  if (!dbUserJSON) {
    console.log("DB error.")
    next(new Error("DB error."))
    return
  }

  const sandbox = dbUserJSON.sandbox.find((s) => s.id === sandboxId)

  if (!sandbox) {
    console.log("Invalid credentials.")
    next(new Error("Invalid credentials."))
    return
  }

  socket.data = {
    id: sandboxId,
    userId,
  }

  next()
})

io.on("connection", async (socket) => {
  const data = socket.data as {
    userId: string
    id: string
  }

  const sandboxFiles = await getSandboxFiles(data.id)

  socket.emit("loaded", sandboxFiles.files)
  socket.on("getFile", (fileId: string, callback) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId)
    if (!file) return

    console.log("file " + file.id + ": ", file.data)
    callback(file.data)
  })
  socket.on("saveFile", (activeId: string, body: string, callback) => {
    // const file = sandboxFiles.fileData.find((f) => f.id === fileId)
    // if (!file) return
    // console.log("file " + file.id + ": ", file.data)
    // callback(file.data)
  })
  socket.on("renameFile", async (fileId: string, newName: string) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId)
    if (!file) return
    await renameFile(fileId, newName, file.data)

    file.id = newName
  })
})

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
