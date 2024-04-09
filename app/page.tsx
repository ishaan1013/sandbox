import Navbar from "@/components/navbar"
import dynamic from "next/dynamic"
import Image from "next/image"

const CodeEditor = dynamic(() => import("@/components/editor"), {
  ssr: false,
})

export default function Home() {
  return (
    <div className="w-screen flex flex-col h-screen bg-background">
      <Navbar />
      <div className="w-screen flex grow">
        <CodeEditor />
      </div>
    </div>
  )
}
