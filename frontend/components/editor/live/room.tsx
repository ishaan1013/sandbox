"use client";

import { RoomProvider } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";

export function Room({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <RoomProvider
      id={id}
      initialPresence={{
        cursor: null,
      }}
    >
      {/* <ClientSideSuspense fallback={<Loading />}> */}
      {children}
      {/* </ClientSideSuspense> */}
    </RoomProvider>
  );
}
