import Image from "next/image"
import Logo from "@/assets/logo.svg"
import { Pencil } from "lucide-react"
import Link from "next/link"
import { Sandbox, User } from "@/lib/types"
import UserButton from "@/components/ui/userButton"

export default function Navbar({
  userData,
  sandboxData,
}: {
  userData: User
  sandboxData: Sandbox
}) {
  return (
    <div className="h-14 px-2 w-full flex items-center justify-between border-b border-border">
      <div className="flex items-center space-x-4">
        <Link
          href="/"
          className="ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none rounded-sm"
        >
          <Image src={Logo} alt="Logo" width={36} height={36} />
        </Link>
        <div className="text-sm font-medium flex items-center">
          {sandboxData.name}
          <div className="h-7 w-7 ml-2 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-md">
            <Pencil className="w-4 h-4" />
          </div>
        </div>
      </div>
      <UserButton userData={userData} />
    </div>
  )
}
