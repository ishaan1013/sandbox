"use client";

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "./xterm.css";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Loader2 } from "lucide-react";

export default function EditorTerminal({
  socket,
  id,
  term,
  setTerm,
}: {
  socket: Socket;
  id: string;
  term: Terminal | null;
  setTerm: (term: Terminal) => void;
}) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#262626",
      },
      fontFamily: "var(--font-geist-mono)",
      fontSize: 14,
    });

    setTerm(terminal);

    return () => {
      if (terminal) terminal.dispose();
    };
  }, []);

  useEffect(() => {
    if (!term) return;

    if (terminalRef.current) {
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      setTerm(term);
    }
    const disposable = term.onData((data) => {
      console.log("terminalData", id, data);
      socket.emit("terminalData", id, data);
    });

    // socket.emit("terminalData", "\n");

    return () => {
      disposable.dispose();
    };
  }, [term, terminalRef.current]);

  return (
    <>
      <div ref={terminalRef} className="w-full h-full text-left">
        {term === null ? (
          <div className="flex items-center text-muted-foreground p-2">
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            <span>Connecting to terminal...</span>
          </div>
        ) : null}
      </div>
    </>
  );
}
