"use client"

import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import "./xterm.css"

import { useEffect, useRef, useState } from "react"
import { Socket } from "socket.io-client"
import { Loader2 } from "lucide-react"

export default function EditorTerminal({ socket }: { socket: Socket }) {
  const terminalRef = useRef(null)
  const [term, setTerm] = useState<Terminal | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#262626",
      },
    })

    setTerm(terminal)

    return () => {
      if (terminal) terminal.dispose()
    }
  }, [])

  useEffect(() => {
    if (!term) return

    const onConnect = () => {
      console.log("Connected to server", socket.connected)
      setTimeout(() => {
        socket.emit("createTerminal", { id: "testId" })
      }, 2000)
    }

    const onTerminalResponse = (response: { data: string }) => {
      // const res = Buffer.from(response.data, "base64").toString("utf-8")
      const res = response.data
      term.write(res)
    }

    socket.on("connect", onConnect)

    if (terminalRef.current) {
      socket.on("terminalResponse", onTerminalResponse)

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current)
      fitAddon.fit()
      setTerm(term)
    }
    const disposable = term.onData((data) => {
      console.log("sending data", data)
      socket.emit("terminalData", "testId", data)
    })

    socket.emit("terminalData", "\n")

    return () => {
      socket.off("connect", onConnect)
      socket.off("terminalResponse", onTerminalResponse)
      disposable.dispose()
    }
  }, [term, terminalRef.current])

  return (
    <div
      ref={terminalRef}
      className="w-full font-mono text-sm h-full text-left"
    >
      {term === null ? (
        <div className="flex items-center text-muted-foreground p-2">
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          <span>Connecting to terminal...</span>
        </div>
      ) : null}
    </div>
  )
}
