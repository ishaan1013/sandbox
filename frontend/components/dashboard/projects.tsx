import { Sandbox } from "@/lib/types"
import ProjectCard from "./projectCard"
import Image from "next/image"
import ProjectCardDropdown from "./projectCard/dropdown"
import { Clock, Globe, Lock } from "lucide-react"
import Link from "next/link"
import { Card } from "../ui/card"

export default function DashboardProjects({
  sandboxes,
}: {
  sandboxes: Sandbox[]
}) {
  return (
    <div className="grow p-4 flex flex-col">
      <div className="text-xl font-medium mb-8">My Projects</div>
      <div className="grow w-full ">
        <div className="w-full grid lg:grid-cols-3 2xl:grid-cols-4 md:grid-cols-2 gap-4">
          {sandboxes.map((sandbox) => (
            <Link
              key={sandbox.id}
              href={`/code/${sandbox.id}`}
              className="cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              <Card className="p-4 h-48 flex flex-col justify-between items-start hover:border-foreground transition-all">
                {/* <ProjectCard key={sandbox.id} id={sandbox.id}> */}
                <div className="space-x-2 flex items-center justify-start w-full">
                  <Image
                    alt=""
                    src={
                      sandbox.type === "react"
                        ? "/project-icons/react.svg"
                        : "/project-icons/node.svg"
                    }
                    width={20}
                    height={20}
                  />
                  <div className="font-medium static whitespace-nowrap w-full text-ellipsis overflow-hidden">
                    {sandbox.name}
                  </div>
                  <ProjectCardDropdown sandbox={sandbox} />
                </div>
                <div className="flex flex-col text-muted-foreground space-y-0.5 text-sm">
                  <div className="flex items-center">
                    {sandbox.visibility === "private" ? (
                      <>
                        <Lock className="w-3 h-3 mr-2" /> Private
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 mr-2" /> Public
                      </>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-2" /> 3d ago
                  </div>
                </div>
                {/* </ProjectCard> */}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
