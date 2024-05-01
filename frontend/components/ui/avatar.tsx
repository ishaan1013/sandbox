import { cn } from "@/lib/utils"

export default function Avatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <div
      className={cn(
        className,
        "w-5 h-5 font-mono rounded-full overflow-hidden bg-gradient-to-t from-neutral-800 to-neutral-600 flex items-center justify-center text-[0.5rem] font-medium"
      )}
    >
      {name
        .split(" ")
        .slice(0, 2)
        .map((letter) => letter[0].toUpperCase())}
    </div>
  )
}
