"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  setUserAndSandboxId: (userId: string, sandboxId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);

  useEffect(() => {
    if (userId && sandboxId) {
      console.log("Initializing socket connection...");
      const newSocket = io(`${process.env.NEXT_PUBLIC_SERVER_URL}?userId=${userId}&sandboxId=${sandboxId}`);
      console.log("Socket instance:", newSocket);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log("Socket connected:", newSocket.id);
      });

      newSocket.on('disconnect', () => {
        console.log("Socket disconnected");
      });

      return () => {
        console.log("Disconnecting socket...");
        newSocket.disconnect();
      };
    }
  }, [userId, sandboxId]);

  const setUserAndSandboxId = (newUserId: string, newSandboxId: string) => {
    setUserId(newUserId);
    setSandboxId(newSandboxId);
  };

  const value = {
    socket,
    setUserAndSandboxId,
  };

  return (
    <SocketContext.Provider value={ value }>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
