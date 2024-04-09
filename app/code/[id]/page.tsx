import Navbar from "@/components/navbar"
import dynamic from "next/dynamic"

const CodeEditor = dynamic(() => import("@/components/editor"), {
  ssr: false,
})

export default function CodePage() {
  return (
    <div className="overflow-hidden overscroll-none w-screen flex flex-col h-screen bg-background">
      <Navbar />
      <div className="w-screen flex grow">
        <CodeEditor />
      </div>
    </div>
  )
}
