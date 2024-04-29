import { spawn, IPty } from "node-pty"
import { Socket } from "socket.io"
import os from "os"

export class Pty {
  socket: Socket
  ptyProcess: IPty
  shell: string

  constructor(socket: Socket, id: string) {
    this.socket = socket
    this.shell = os.platform() === "win32" ? "cmd.exe" : "bash"

    this.ptyProcess = spawn(this.shell, [], {
      name: "xterm",
      cols: 100,
      cwd: `/temp`,
      // env: process.env as { [key: string]: string },
    })

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

  //   if (os.platform() !== "win32") {
  //     this.ptyProcess.kill()
  //     return
  //   }
  // }
}
