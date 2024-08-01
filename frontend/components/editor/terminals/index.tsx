"use client";

import { Button } from "@/components/ui/button";
import Tab from "@/components/ui/tab";
import { Terminal } from "@xterm/xterm";
import { Loader2, Plus, SquareTerminal, TerminalSquare } from "lucide-react";
import { toast } from "sonner";
import EditorTerminal from "./terminal";
import { useTerminal } from "@/context/TerminalContext";
import { useEffect } from "react";

export default function Terminals() {
  const {
    terminals,
    setTerminals,
    socket,
    createNewTerminal,
    closeTerminal,
    activeTerminalId,
    setActiveTerminalId,
    creatingTerminal,
  } = useTerminal();

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId);

  // Effect to set the active terminal when a new one is created
  useEffect(() => {
    if (terminals.length > 0 && !activeTerminalId) {
      setActiveTerminalId(terminals[terminals.length - 1].id);
    }
  }, [terminals, activeTerminalId, setActiveTerminalId]);

  const handleCreateTerminal = () => {
    if (terminals.length >= 4) {
      toast.error("You reached the maximum # of terminals.");
      return;
    }
    createNewTerminal();
  };

  return (
    <>
      <div className="h-10 w-full overflow-auto flex gap-2 shrink-0 tab-scroll">
        {terminals.map((term) => (
          <Tab
            key={term.id}
            creating={creatingTerminal}
            onClick={() => setActiveTerminalId(term.id)}
            onClose={() => closeTerminal(term.id)}
            selected={activeTerminalId === term.id}
          >
            <SquareTerminal className="w-4 h-4 mr-2" />
            Shell
          </Tab>
        ))}
        <Button
          disabled={creatingTerminal}
          onClick={handleCreateTerminal}
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