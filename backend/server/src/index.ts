import express, { Express, NextFunction, Request, Response } from "express"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"

import { z } from "zod"

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

io.use(async (socket, next) => {
  const q = socket.handshake.query

  console.log("middleware")
  console.log(q)

  if (!q.userId || !q.sandboxId) {
    next(new Error("Invalid request."))
  }

  const dbUser = await fetch(`http://localhost:8787/api/user?id=${q.userId}`)
  const dbUserJSON = await dbUser.json()

  if (!dbUserJSON || !dbUserJSON.sandbox.includes(q.sandboxId)) {
    next(new Error("Invalid credentials."))
  }

  next()
})

io.on("connection", async (socket) => {
  console.log(`connection`)
  const userId = socket.handshake.query.userId

  console.log(userId)

  // socket.emit("loaded", {
  //     rootContent: await fetchDir("/workspace", "")
  // });

  // initHandlers(socket, replId);
})

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
