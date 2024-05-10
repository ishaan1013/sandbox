"use client";

import { Button } from "@/components/ui/button";
import Tab from "@/components/ui/tab";
import { closeTerminal, createTerminal } from "@/lib/terminal";
import { Terminal } from "@xterm/xterm";
import { Loader2, Plus, SquareTerminal, TerminalSquare } from "lucide-react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";
import EditorTerminal from "./terminal";

export default function Terminals({
  terminals,
  setTerminals,
  activeTerminalId,
  setActiveTerminalId,
  socket,
  activeTerminal,
  creatingTerminal,
  setCreatingTerminal,
  closingTerminal,
  setClosingTerminal,
}: {
  terminals: { id: string; terminal: Terminal | null }[];
  setTerminals: React.Dispatch<
    React.SetStateAction<
      {
        id: string;
        terminal: Terminal | null;
      }[]
    >
  >;
  activeTerminalId: string;
  setActiveTerminalId: React.Dispatch<React.SetStateAction<string>>;
  socket: Socket;
  activeTerminal:
    | {
        id: string;
        terminal: Terminal | null;
      }
    | undefined;
  creatingTerminal: boolean;
  setCreatingTerminal: React.Dispatch<React.SetStateAction<boolean>>;
  closingTerminal: string;
  setClosingTerminal: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <>
      <div className="h-10 w-full overflow-auto flex gap-2 shrink-0 tab-scroll">
        {terminals.map((term) => (
          <Tab
            key={term.id}
            creating={creatingTerminal}
            onClick={() => setActiveTerminalId(term.id)}
            onClose={() =>
              closeTerminal({
                term,
                terminals,
                setTerminals,
                setActiveTerminalId,
                setClosingTerminal,
                socket,
                activeTerminalId,
              })
            }
            closing={closingTerminal === term.id}
            selected={activeTerminalId === term.id}
          >
            <SquareTerminal className="w-4 h-4 mr-2" />
            Shell
          </Tab>
        ))}
        <Button
          disabled={creatingTerminal}
          onClick={() => {
            if (terminals.length >= 4) {
              toast.error("You reached the maximum # of terminals.");
              return;
            }
            createTerminal({
              setTerminals,
              setActiveTerminalId,
              setCreatingTerminal,
              socket,
            });
          }}
          size="smIcon"
          variant={"secondary"}
          className={`font-normal shrink-0 select-none text-muted-foreground disabled:opacity-50`}
        >
          {creatingTerminal ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </Button>
      </div>
      {socket && activeTerminal ? (
        <div className="w-full relative grow h-full overflow-hidden rounded-md bg-secondary">
          {terminals.map((term) => (
            <EditorTerminal
              key={term.id}
              socket={socket}
              id={term.id}
              term={term.terminal}
              setTerm={(t: Terminal) => {
                setTerminals((prev) =>
                  prev.map((term) =>
                    term.id === activeTerminalId
                      ? { ...term, terminal: t }
                      : term
                  )
                );
              }}
              visible={activeTerminalId === term.id}
            />
          ))}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-lg font-medium text-muted-foreground/50 select-none">
          <TerminalSquare className="w-4 h-4 mr-2" />
          No terminals open.
        </div>
      )}
    </>
  );
}
