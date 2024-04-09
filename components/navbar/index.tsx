import { ChevronLeft, Home } from "lucide-react"
import { Button } from "../ui/button"

export default function Navbar() {
  return (
    <div className="h-12 px-2 w-full flex items-center justify-between">
      <div className="flex items-center">
        <Button variant="outline">
          <ChevronLeft className="w-4 h-4 mr-2" /> Go Home
        </Button>
      </div>
    </div>
  )
}
