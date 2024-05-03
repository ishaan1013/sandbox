"use client"

import { RoomProvider } from "@/liveblocks.config"
import { useSearchParams } from "next/navigation"
import { ClientSideSuspense } from "@liveblocks/react"

export function Room({ children }: { children: React.ReactNode }) {
  // const roomId = useExampleRoomId("liveblocks:examples:nextjs-yjs-monaco");

  return (
    <RoomProvider
      id={"roomId"}
      initialPresence={{
        cursor: null,
      }}
    >
      <ClientSideSuspense fallback={<div>Loading!!!!</div>}>
        {() => children}
      </ClientSideSuspense>
    </RoomProvider>
  )
}
