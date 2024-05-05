"use client"

import { useOthers } from "@/liveblocks.config"

const classNames = {
  red: "w-8 h-8 leading-none font-mono rounded-full ring-1 ring-red-700 ring-offset-2 ring-offset-background overflow-hidden bg-gradient-to-tr from-red-950 to-red-600 flex items-center justify-center text-xs font-medium",
  orange:
    "w-8 h-8 leading-none font-mono rounded-full ring-1 ring-orange-700 ring-offset-2 ring-offset-background overflow-hidden bg-gradient-to-tr from-orange-950 to-orange-600 flex items-center justify-center text-xs font-medium",
  yellow:
    "w-8 h-8 leading-none font-mono rounded-full ring-1 ring-yellow-700 ring-offset-2 ring-offset-background overflow-hidden bg-gradient-to-tr from-yellow-950 to-yellow-600 flex items-center justify-center text-xs font-medium",
  green:
    "w-8 h-8 leading-none font-mono rounded-full ring-1 ring-green-700 ring-offset-2 ring-offset-background overflow-hidden bg-gradient-to-tr from-green-950 to-green-600 flex items-center justify-center text-xs font-medium",
  blue: "w-8 h-8 leading-none font-mono rounded-full ring-1 ring-blue-700 ring-offset-2 ring-offset-background overflow-hidden bg-gradient-to-tr from-blue-950 to-blue-600 flex items-center justify-center text-xs font-medium",
  purple:
    "w-8 h-8 leading-none font-mono rounded-full ring-1 ring-purple-700 ring-offset-2 ring-offset-background overflow-hidden bg-gradient-to-tr from-purple-950 to-purple-600 flex items-center justify-center text-xs font-medium",
  pink: "w-8 h-8 leading-none font-mono rounded-full ring-1 ring-pink-700 ring-offset-2 ring-offset-background overflow-hidden bg-gradient-to-tr from-pink-950 to-pink-600 flex items-center justify-center text-xs font-medium",
}

export function Avatars() {
  const users = useOthers()

  return (
    <>
      <div className="flex space-x-2">
        {users.map(({ connectionId, info }) => {
          return (
            <div className={classNames[info.color]}>
              {info.name
                .split(" ")
                .slice(0, 2)
                .map((letter) => letter[0].toUpperCase())}
            </div>
          )
        })}
      </div>
      <div className="h-full w-[1px] bg-border mx-2" />
    </>
  )
}
