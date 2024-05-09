// Helper functions for terminal instances

import { createId } from "@paralleldrive/cuid2";
import { Terminal } from "@xterm/xterm";
import { Socket } from "socket.io-client";

export const createTerminal = ({
  setTerminals,
  setActiveTerminalId,
  setCreatingTerminal,
  socket,
}: {
  setTerminals: React.Dispatch<React.SetStateAction<{
    id: string;
    terminal: Terminal | null;
}[]>>;
  setActiveTerminalId: React.Dispatch<React.SetStateAction<string>>;
  setCreatingTerminal: React.Dispatch<React.SetStateAction<boolean>>;
  socket: Socket;

}) => {
  setCreatingTerminal(true);
  const id = createId();
  console.log("creating terminal, id:", id);

  setTerminals((prev) => [...prev, { id, terminal: null }]);
  setActiveTerminalId(id);

  setTimeout(() => {
    socket.emit("createTerminal", id, () => {
      setCreatingTerminal(false);
    });
  }, 1000);
};

export const closeTerminal = ({
  term,
  terminals,
  setTerminals,
  setActiveTerminalId,
  setClosingTerminal,
  socket,
  activeTerminalId,
} : {
  term: { 
    id: string; 
    terminal: Terminal | null 
  }
  terminals: { 
    id: string; 
    terminal: Terminal | null 
  }[]
  setTerminals: React.Dispatch<React.SetStateAction<{ 
    id: string; 
    terminal: Terminal | null 
  }[]>>
  setActiveTerminalId: React.Dispatch<React.SetStateAction<string>>
  setClosingTerminal: React.Dispatch<React.SetStateAction<string>>
  socket: Socket
  activeTerminalId: string
}) => {
  const numTerminals = terminals.length;
  const index = terminals.findIndex((t) => t.id === term.id);
  if (index === -1) return;

  setClosingTerminal(term.id);

  socket.emit("closeTerminal", term.id, () => {
    setClosingTerminal("");

    const nextId =
      activeTerminalId === term.id
        ? numTerminals === 1
          ? null
          : index < numTerminals - 1
          ? terminals[index + 1].id
          : terminals[index - 1].id
        : activeTerminalId;

    setTerminals((prev) => prev.filter((t) => t.id !== term.id));

    if (!nextId) {
      setActiveTerminalId("");
    } else {
      const nextTerminal = terminals.find((t) => t.id === nextId);
      if (nextTerminal) {
        setActiveTerminalId(nextTerminal.id);
      }
    }
  });
};