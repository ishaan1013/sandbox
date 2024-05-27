import { useEffect, useMemo, useState } from "react"
import {
  AwarenessList,
  TypedLiveblocksProvider,
  UserAwareness,
  useSelf,
} from "@/liveblocks.config"
import { colors } from "@/lib/colors"

export function Cursors({
  yProvider,
  userInfo,
}: {
  yProvider: TypedLiveblocksProvider
  userInfo: {
    name: string
    email: string
    color: "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink"
  }
}) {
  // Get user info from Liveblocks authentication endpoint

  const [awarenessUsers, setAwarenessUsers] = useState<AwarenessList>([])

  useEffect(() => {
    // Add user info to Yjs awareness
    const localUser: UserAwareness["user"] = userInfo
    yProvider.awareness.setLocalStateField("user", localUser)

    // On changes, update `awarenessUsers`
    function setUsers() {
      setAwarenessUsers(
        Array.from(yProvider.awareness.getStates()) as AwarenessList
      )
    }
    yProvider.awareness.on("change", setUsers)
    setUsers()

    return () => {
      yProvider.awareness.off("change", setUsers)
    }
  }, [yProvider])

  // Insert awareness info into cursors with styles
  const styleSheet = useMemo(() => {
    let cursorStyles = ""

    for (const [clientId, client] of awarenessUsers) {
      if (client?.user) {
        cursorStyles += `
          .yRemoteSelection-${clientId},
          .yRemoteSelectionHead-${clientId}  {
            --user-color: ${colors[client.user.color]};
          }
          
          .yRemoteSelectionHead-${clientId}::after {
            content: "${client.user.name}";
          }
        `
      }
    }

    return { __html: cursorStyles }
  }, [awarenessUsers])

  return <style dangerouslySetInnerHTML={styleSheet} />
}
