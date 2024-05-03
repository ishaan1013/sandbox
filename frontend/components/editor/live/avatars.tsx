import { useOthers, useSelf } from "@/liveblocks.config"
import Avatar from "@/components/ui/avatar"

export function Avatars() {
  const users = useOthers()
  const currentUser = useSelf()

  return (
    <div className="flex">
      {users.map(({ connectionId, info }) => {
        return <Avatar key={connectionId} name={info.name} />
      })}

      {currentUser && (
        <div className="relative ml-8 first:ml-0">
          <Avatar name={currentUser.info.name} />
        </div>
      )}
    </div>
  )
}
