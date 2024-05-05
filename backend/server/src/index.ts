import fs from "fs"
import os from "os"
import path from "path"
import express, { Express } from "express"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"

import { z } from "zod"
import { User } from "./types"
import {
  createFile,
  deleteFile,
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
  const sharedSandboxes = dbUserJSON.usersToSandboxes.find(
    (uts) => uts.sandboxId === sandboxId
  )

  if (!sandbox && !sharedSandboxes) {
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
      socket.emit("rateLimit", "Rate limited: file saving. Please slow down.")
    }
  })

  socket.on("createFile", async (name: string) => {
    try {
      await createFileRL.consume(data.userId, 1)

      const id = `projects/${data.id}/${name}`

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
    } catch (e) {
      socket.emit("rateLimit", "Rate limited: file creation. Please slow down.")
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
      socket.emit("rateLimit", "Rate limited: file renaming. Please slow down.")
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

      const newFiles = await getSandboxFiles(data.id)
      callback(newFiles.files)
    } catch (e) {
      socket.emit("rateLimit", "Rate limited: file deletion. Please slow down.")
    }
  })

  socket.on("createTerminal", ({ id }: { id: string }) => {
    if (terminals[id]) {
      console.log("Terminal already exists.")
      return
    }
    if (Object.keys(terminals).length >= 4) {
      console.log("Too many terminals.")
      return
    }

    const pty = spawn(os.platform() === "win32" ? "cmd.exe" : "bash", [], {
      name: "xterm",
      cols: 100,
      cwd: path.join(dirName, "projects", data.id),
    })

    const onData = pty.onData((data) => {
      socket.emit("terminalResponse", {
        // data: Buffer.from(data, "utf-8").toString("base64"),
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
  })

  socket.on("terminalData", (id: string, data: string) => {
    if (!terminals[id]) {
      console.log("terminals", terminals)
      return
    }

    try {
      terminals[id].terminal.write(data)
    } catch (e) {
      console.log("Error writing to terminal", e)
    }
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
      console.log("Generating code...")
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_USER_ID}/ai/run/@cf/meta/llama-3-8b-instruct`,
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
                  "You are an expert coding assistant. You read code from a file, and you suggest new code to add to the file. You may be given instructions on what to generate, which you should follow. You should generate code that is correct, efficient, and follows best practices. You should also generate code that is clear and easy to read. When you generate code, you should only return the code, and nothing else. You should not include backticks in the code you generate.",
              },
              {
                role: "user",
                content: `The file is called ${fileName}.`,
              },
              {
                role: "user",
                content: `Here are my instructions on what to generate: ${instructions}.`,
              },
              {
                role: "user",
                content: `Suggest me code to insert at line ${line} in my file. Give only the code, and NOTHING else. DO NOT include backticks in your response. My code file content is as follows 
                
${code}`,
              },
            ],
          }),
        }
      )

      const json = await res.json()
      callback(json)
    }
  )

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
