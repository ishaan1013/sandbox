import { spawn, IPty } from "node-pty"
import { Socket } from "socket.io"
import os from "os"

export class Pty {
  socket: Socket
  ptyProcess: IPty
  id: string

  constructor(socket: Socket, id: string, cwd: string) {
    this.socket = socket
    this.id = id

    this.ptyProcess = spawn(
      os.platform() === "win32" ? "cmd.exe" : "bash",
      [],
      {
        name: "xterm",
        cols: 100,
        cwd: cwd,
      }
    )

    this.ptyProcess.onData((data) => {
      console.log("onData", data)
      this.send(data)
    })

    // this.write("hello world")
  }

  write(data: string) {
    console.log("writing data", data)

    this.ptyProcess.write(data)
  }

  send(data: string) {
    this.socket.emit("terminalResponse", {
      data: Buffer.from(data, "utf-8"),
    })
  }

  // kill() {
  //   console.log("killing terminal")

  // if (os.platform() !== "win32") {
  //   this.ptyProcess.kill()
  //   return
  // }
  // }
}
