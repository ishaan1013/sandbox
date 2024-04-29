import fs from "fs"
import path from "path"
import express, { Express, NextFunction, Request, Response } from "express"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"

import { z } from "zod"
import { User } from "./types"
import { createFile, getSandboxFiles, renameFile, saveFile } from "./utils"
import { Pty } from "./terminal"

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

const terminals: { [id: string]: Pty } = {}

const dirName = path.join(__dirname, "..")

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
  sandboxFiles.fileData.forEach((file) => {
    const filePath = path.join(dirName, file.id)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFile(filePath, file.data, function (err) {
      if (err) throw err
      // console.log("Saved File:", file.id)
    })
  })

  socket.emit("loaded", sandboxFiles.files)

  socket.on("getFile", (fileId: string, callback) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId)
    if (!file) return

    // console.log("get file " + file.id + ": ", file.data.slice(0, 10) + "...")
    callback(file.data)
  })

  // todo: send diffs + debounce for efficiency
  socket.on("saveFile", async (fileId: string, body: string) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId)
    if (!file) return
    file.data = body
    // console.log("save file " + file.id + ": ", file.data)

    fs.writeFile(path.join(dirName, file.id), body, function (err) {
      if (err) throw err
    })
    await saveFile(fileId, body)
  })

  socket.on("createFile", async (name: string) => {
    const id = `projects/${data.id}/${name}`
    console.log("create file", id, name)

    fs.writeFile(path.join(dirName, id), "", function (err) {
      if (err) throw err
    })

    sandboxFiles.files.push({
      id,
      name,
      type: "file",
    })

    sandboxFiles.fileData.push({
      id,
      data: "",
    })

    await createFile(id)
  })

  socket.on("renameFile", async (fileId: string, newName: string) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId)
    if (!file) return
    file.id = newName

    const parts = fileId.split("/")
    const newFileId = parts.slice(0, parts.length - 1).join("/") + "/" + newName

    fs.rename(
      path.join(dirName, fileId),
      path.join(dirName, newFileId),
      function (err) {
        if (err) throw err
      }
    )
    await renameFile(fileId, newFileId, file.data)
  })

  socket.on("createTerminal", ({ id }: { id: string }) => {
    console.log("creating terminal (" + id + ")")
    terminals[id] = new Pty(socket, id, `/projects/${data.id}`)
  })

  socket.on("terminalData", ({ id, data }: { id: string; data: string }) => {
    console.log(`Received data for terminal ${id}: ${data}`)

    if (!terminals[id]) {
      console.log("terminal not found")
      console.log("terminals", terminals)
      return
    }

    console.log(`Writing to terminal ${id}`)
    terminals[id].write(data)
  })

  socket.on("disconnect", () => {})
})

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
