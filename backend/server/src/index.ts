import fs from "fs"
import os from "os"
import path from "path"
import cors from "cors"
import express, { Express } from "express"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"

import { z } from "zod"
import { User } from "./types"
import {
  createFile,
  deleteFile,
  generateCode,
  getProjectSize,
  getSandboxFiles,
  renameFile,
  saveFile,
} from "./utils"
import { IDisposable, IPty, spawn } from "node-pty"
import {
  MAX_BODY_SIZE,
  createFileRL,
  deleteFileRL,
  renameFileRL,
  saveFileRL,
} from "./ratelimit"

dotenv.config()

const app: Express = express()
const port = process.env.PORT || 4000
app.use(cors())
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
})

let inactivityTimeout: NodeJS.Timeout | null = null;
let isOwnerConnected = false;

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
    ("Invalid request.")
    next(new Error("Invalid request."))
    return
  }

  const { sandboxId, userId } = parseQuery.data
  const dbUser = await fetch(`https://database.ishaan1013.workers.dev/api/user?id=${userId}`)
  const dbUserJSON = (await dbUser.json()) as User

  if (!dbUserJSON) {
    next(new Error("DB error."))
    return
  }

  const sandbox = dbUserJSON.sandbox.find((s) => s.id === sandboxId)
  const sharedSandboxes = dbUserJSON.usersToSandboxes.find(
    (uts) => uts.sandboxId === sandboxId
  )

  if (!sandbox && !sharedSandboxes) {
    next(new Error("Invalid credentials."))
    return
  }

  socket.data = {
    userId,
    sandboxId: sandboxId,
    isOwner: sandbox !== undefined,
  }

  next()
})

io.on("connection", async (socket) => {

  if (inactivityTimeout) clearTimeout(inactivityTimeout);

  const data = socket.data as {
    userId: string
    sandboxId: string
    isOwner: boolean
  }

  if (data.isOwner) {
    isOwnerConnected = true
  } else {
    if (!isOwnerConnected) {
      socket.emit("disableAccess", "The sandbox owner is not connected.")
      return
    }
  }

  const sandboxFiles = await getSandboxFiles(data.sandboxId)
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
    try {
      await saveFileRL.consume(data.userId, 1)

      if (Buffer.byteLength(body, "utf-8") > MAX_BODY_SIZE) {
        socket.emit(
          "rateLimit",
          "Rate limited: file size too large. Please reduce the file size."
        )
        return
      }

      const file = sandboxFiles.fileData.find((f) => f.id === fileId)
      if (!file) return
      file.data = body

      fs.writeFile(path.join(dirName, file.id), body, function (err) {
        if (err) throw err
      })
      await saveFile(fileId, body)
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file saving. Please slow down.")
    }
  })

  socket.on("moveFile", async (fileId: string, folderId: string, callback) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId)
    if (!file) return

    const parts = fileId.split("/")
    const newFileId = folderId + "/" + parts.pop()

    fs.rename(
      path.join(dirName, fileId),
      path.join(dirName, newFileId),
      function (err) {
        if (err) throw err
      }
    )

    file.id = newFileId

    await renameFile(fileId, newFileId, file.data)
    const newFiles = await getSandboxFiles(data.sandboxId)

    callback(newFiles.files)
  })

  socket.on("createFile", async (name: string, callback) => {
    try {

      const size: number = await getProjectSize(data.sandboxId)
      // limit is 200mb
      if (size > 200 * 1024 * 1024) {
        io.emit("rateLimit", "Rate limited: project size exceeded. Please delete some files.")
        callback({success: false})
      }

      await createFileRL.consume(data.userId, 1)

      const id = `projects/${data.sandboxId}/${name}`

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

      callback({success: true})
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file creation. Please slow down.")
    }
  })

  socket.on("renameFile", async (fileId: string, newName: string) => {
    try {
      await renameFileRL.consume(data.userId, 1)

      const file = sandboxFiles.fileData.find((f) => f.id === fileId)
      if (!file) return
      file.id = newName

      const parts = fileId.split("/")
      const newFileId =
        parts.slice(0, parts.length - 1).join("/") + "/" + newName

      fs.rename(
        path.join(dirName, fileId),
        path.join(dirName, newFileId),
        function (err) {
          if (err) throw err
        }
      )
      await renameFile(fileId, newFileId, file.data)
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file renaming. Please slow down.")
      return
    }
  })

  socket.on("deleteFile", async (fileId: string, callback) => {
    try {
      await deleteFileRL.consume(data.userId, 1)
      const file = sandboxFiles.fileData.find((f) => f.id === fileId)
      if (!file) return

      fs.unlink(path.join(dirName, fileId), function (err) {
        if (err) throw err
      })
      sandboxFiles.fileData = sandboxFiles.fileData.filter(
        (f) => f.id !== fileId
      )

      await deleteFile(fileId)

      const newFiles = await getSandboxFiles(data.sandboxId)
      callback(newFiles.files)
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file deletion. Please slow down.")
    }
  })

  socket.on("createTerminal", (id: string, callback) => {
    console.log("creating terminal", id)
    if (terminals[id] || Object.keys(terminals).length >= 4) {
      return
    }

    const pty = spawn(os.platform() === "win32" ? "cmd.exe" : "bash", [], {
      name: "xterm",
      cols: 100,
      cwd: path.join(dirName, "projects", data.sandboxId),
    })

    const onData = pty.onData((data) => {
      // console.log("terminalResponse", id, data)
      io.emit("terminalResponse", {
        id,
        data,
      })
    })

    const onExit = pty.onExit((code) => console.log("exit :(", code))

    pty.write("clear\r")

    terminals[id] = {
      terminal: pty,
      onData,
      onExit,
    }

    callback()
  })

  socket.on("resizeTerminal", (dimensions: { cols: number; rows: number }) => {
    console.log("resizeTerminal", dimensions)
    Object.values(terminals).forEach((t) => {
      t.terminal.resize(dimensions.cols, dimensions.rows)
    })
  
  })

  socket.on("terminalData", (id: string, data: string) => {
    if (!terminals[id]) {
      console.log("terminal not found", id)
      return
    }

    try {
      terminals[id].terminal.write(data)
    } catch (e) {
      console.log("Error writing to terminal", e)
    }
  })

  socket.on("closeTerminal", (id: string, callback) => {
    if (!terminals[id]) {
      return
    }

    terminals[id].onData.dispose()
    terminals[id].onExit.dispose()
    delete terminals[id]

    callback()
  })

  socket.on(
    "generateCode",
    async (
      fileName: string,
      code: string,
      line: number,
      instructions: string,
      callback
    ) => {
      const fetchPromise = fetch(`https://database.ishaan1013.workers.dev/api/sandbox/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: data.userId,
        }),
      })

      const generateCodePromise = generateCode({
        fileName,
        code,
        line,
        instructions,
      })

      const [fetchResponse, generateCodeResponse] = await Promise.all([
        fetchPromise,
        generateCodePromise,
      ])

      const json = await generateCodeResponse.json()
      callback(json)
    }
  )

  socket.on("disconnect", async () => {
    if (data.isOwner) {
      // console.log("deleting all terminals")
      Object.entries(terminals).forEach((t) => {
        const { terminal, onData, onExit } = t[1]
        onData.dispose()
        onExit.dispose()
        delete terminals[t[0]]
      })

      socket.broadcast.emit("disableAccess", "The sandbox owner has disconnected.")
    }

    const sockets = await io.fetchSockets()
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout)
    };
    if (sockets.length === 0) {
      inactivityTimeout = setTimeout(() => {
        io.fetchSockets().then(sockets => {
          if (sockets.length === 0) {
              console.log("No users have been connected for 15 seconds.");
          }
      });
      }, 15000);
    }

  })
})

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
