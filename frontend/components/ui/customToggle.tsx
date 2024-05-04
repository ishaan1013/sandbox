import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

const Toggle = ({
  children,
  className,
  value,
  setValue,
}: {
  children: React.ReactNode
  className?: string
  value: boolean
  setValue: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  if (value)
    return (
      <button
        onClick={() => setValue(false)}
        className={cn(
          className,
          `gradient-button-bg p-[1px] inline-flex group rounded-md text-sm font-medium focus-visible:ring-offset-2 h-9 focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50`
        )}
      >
        <div className="rounded-[6px] w-full gradient-button flex items-center justify-center whitespace-nowrap px-4 py-2 h-full">
          {children}
        </div>
      </button>
    )
  else
    return (
      <Button
        className="w-full"
        variant="outline"
        onClick={() => setValue(true)}
      >
        {children}
      </Button>
    )
}

export default Toggle
