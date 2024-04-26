import express, { Express, NextFunction, Request, Response } from "express"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"

import { z } from "zod"
import { User } from "./types"
import getSandboxFiles from "./getSandboxFiles"

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
  type: z.enum(["node", "react"]),
  EIO: z.string(),
  transport: z.string(),
})

io.use(async (socket, next) => {
  const q = socket.handshake.query

  console.log("middleware")

  const parseQuery = handshakeSchema.safeParse(q)

  if (!parseQuery.success) {
    console.log("Invalid request.")
    next(new Error("Invalid request."))
    return
  }

  const { sandboxId, userId, type } = parseQuery.data

  const dbUser = await fetch(`http://localhost:8787/api/user?id=${userId}`)
  const dbUserJSON = (await dbUser.json()) as User

  console.log("dbUserJSON:", dbUserJSON)

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
    type,
    userId,
  }

  next()
})

io.on("connection", async (socket) => {
  const data = socket.data as {
    userId: string
    id: string
    type: "node" | "react"
  }

  const sandboxFiles = await getSandboxFiles(data.id)

  // fetch all file data TODO

  // socket.emit("loaded", {
  //     rootContent: await fetchDir("/workspace", "")
  // });

  // initHandlers(socket, replId);
})

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
