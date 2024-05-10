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
  visible,
}: {
  socket: Socket;
  id: string;
  term: Terminal | null;
  setTerm: (term: Terminal) => void;
  visible: boolean;
}) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;
    // console.log("new terminal", id, term ? "reusing" : "creating");

    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#262626",
      },
      fontFamily: "var(--font-geist-mono)",
      fontSize: 14,
      lineHeight: 1.5,
      letterSpacing: 0,
    });

    setTerm(terminal);

    return () => {
      if (terminal) terminal.dispose();
    };
  }, []);

  useEffect(() => {
    if (!term) return;

    if (!terminalRef.current) return;
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    const disposableOnData = term.onData((data) => {
      console.log("terminalData", id, data);
      socket.emit("terminalData", id, data);
    });

    const disposableOnResize = term.onResize((dimensions) => {
      // const terminal_size = {
      //   width: dimensions.cols,
      //   height: dimensions.rows,
      // };
      fitAddon.fit();
      socket.emit("terminalResize", dimensions);
    });

    return () => {
      disposableOnData.dispose();
      disposableOnResize.dispose();
    };
  }, [term, terminalRef.current]);

  return (
    <>
      <div
        ref={terminalRef}
        style={{ display: visible ? "block" : "none" }}
        className="w-full h-full text-left"
      >
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
