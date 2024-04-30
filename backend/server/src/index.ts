import fs from "fs"
import os from "os"
import path from "path"
import express, { Express } from "express"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"

import { z } from "zod"
import { User } from "./types"
import { createFile, getSandboxFiles, renameFile, saveFile } from "./utils"
import { IDisposable, IPty, spawn } from "node-pty"

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

const terminals: {
  [id: string]: { terminal: IPty; onData: IDisposable; onExit: IDisposable }
} = {}

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
    })
  })

  socket.emit("loaded", sandboxFiles.files)

  socket.on("getFile", (fileId: string, callback) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId)
    if (!file) return

    callback(file.data)
  })

  // todo: send diffs + debounce for efficiency
  socket.on("saveFile", async (fileId: string, body: string) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId)
    if (!file) return
    file.data = body

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
    console.log("creating terminal, id=" + id)
    const pty = spawn(os.platform() === "win32" ? "cmd.exe" : "bash", [], {
      name: "xterm",
      cols: 100,
      cwd: path.join(dirName, "projects", data.id),
    })

    const onData = pty.onData((data) => {
      console.log(data)
      socket.emit("terminalResponse", {
        // data: Buffer.from(data, "utf-8").toString("base64"),
        data,
      })
    })

    const onExit = pty.onExit((code) => console.log("exit :(", code))

    terminals[id] = {
      terminal: pty,
      onData,
      onExit,
    }
  })

  socket.on("terminalData", (id: string, data: string) => {
    // socket.on("terminalData", (data: string) => {
    console.log(`Received data for terminal ${id}: ${data}`)
    // pty.write(data)

    if (!terminals[id]) {
      console.log("terminal not found")
      console.log("terminals", terminals)
      return
    }

    try {
      terminals[id].terminal.write(data)
    } catch (e) {
      console.log("Error writing to terminal", e)
    }
  })

  socket.on("disconnect", () => {
    Object.entries(terminals).forEach((t) => {
      const { terminal, onData, onExit } = t[1]
      if (os.platform() !== "win32") terminal.kill()
      onData.dispose()
      onExit.dispose()
      delete terminals[t[0]]
    })
  })
})

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
