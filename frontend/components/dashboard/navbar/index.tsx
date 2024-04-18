import Image from "next/image"
import Link from "next/link"
import Logo from "@/assets/logo.svg"
import DashboardNavbarSearch from "./search"
import UserButton from "../../ui/userButton"
import { User } from "@/lib/types"

export default function DashboardNavbar({ userData }: { userData: User }) {
  return (
    <div className="h-16 px-4 w-full flex items-center justify-between border-b border-border">
      <div className="flex items-center space-x-4">
        <Link
          href="/"
          className="ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none rounded-sm"
        >
          <Image src={Logo} alt="Logo" width={36} height={36} />
        </Link>
        <div className="text-sm font-medium flex items-center">Sandbox</div>
      </div>
      <div className="flex items-center space-x-4">
        <DashboardNavbarSearch />
        <UserButton userData={userData} />
      </div>
    </div>
  )
}
