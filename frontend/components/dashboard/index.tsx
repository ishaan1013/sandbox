"use client"

import CustomButton from "@/components/ui/customButton"
import { Button } from "@/components/ui/button"
import {
  Clock,
  Code2,
  Ellipsis,
  FolderDot,
  Globe,
  HelpCircle,
  Plus,
  Settings,
  Users,
} from "lucide-react"
import { useState } from "react"
import ProjectCard from "./projectCard"
import { Sandbox } from "@/lib/types"
import Image from "next/image"
import ProjectCardDropdown from "./projectCard/dropdown"

type TScreen = "projects" | "shared" | "settings" | "search"

export default function Dashboard({ sandboxes }: { sandboxes: Sandbox[] }) {
  const [screen, setScreen] = useState<TScreen>("projects")

  const activeScreen = (s: TScreen) => {
    if (screen === s) return "justify-start"
    else return "justify-start font-normal text-muted-foreground"
  }

  return (
    <div className="flex grow w-full">
      <div className="w-56 shrink-0 border-r border-border p-4 justify-between flex flex-col">
        <div className="flex flex-col">
          <CustomButton className="mb-4">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </CustomButton>
          <Button
            variant="ghost"
            onClick={() => setScreen("projects")}
            className={activeScreen("projects")}
          >
            <FolderDot className="w-4 h-4 mr-2" />
            My Projects
          </Button>
          <Button
            variant="ghost"
            onClick={() => setScreen("shared")}
            className={activeScreen("shared")}
          >
            <Users className="w-4 h-4 mr-2" />
            Shared Rooms
          </Button>
          <Button
            variant="ghost"
            onClick={() => setScreen("settings")}
            className={activeScreen("settings")}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
        <div className="flex flex-col">
          <Button
            variant="ghost"
            className="justify-start font-normal text-muted-foreground"
          >
            <Code2 className="w-4 h-4 mr-2" />
            GitHub Repository
          </Button>
          <Button
            variant="ghost"
            className="justify-start font-normal text-muted-foreground"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            About
          </Button>
        </div>
      </div>
      {screen === "projects" ? (
        <div className="grow p-4 grid lg:grid-cols-3 2xl:grid-cols-4  md:grid-cols-2 gap-4">
          {sandboxes.map((sandbox) => (
            <ProjectCard key={sandbox.id}>
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
                  <Globe className="w-3 h-3 mr-2" /> Public
                </div>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-2" /> 3d ago
                </div>
              </div>
            </ProjectCard>
          ))}
        </div>
      ) : screen === "shared" ? null : screen === "settings" ? null : null}
    </div>
  )
}
