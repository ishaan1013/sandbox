"use client"

import { Input } from "../../ui/input"
import { Search } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function DashboardNavbarSearch() {
  const [search, setSearch] = useState("")
  const router = useRouter()

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      console.log("SEARCH", search)
      if (search) {
        router.push(`/dashboard?q=${search}`)
      } else {
        router.push(`/dashboard`)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [search])

  return (
    <div className="relative h-9 w-44 flex items-center justify-start">
      <Search className="w-4 h-4 absolute left-2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search projects..."
        className="pl-8"
      />
    </div>
  )
}