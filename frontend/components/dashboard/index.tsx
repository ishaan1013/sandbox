"use client"

import CustomButton from "@/components/ui/customButton"
import { Button } from "@/components/ui/button"
import {
  Bolt,
  Clock,
  Code2,
  FolderDot,
  FolderOpenDot,
  Globe,
  HelpCircle,
  Plus,
  Settings,
  User,
  Users,
} from "lucide-react"
import { useState } from "react"
import { Card } from "../ui/card"
import ProjectCard from "./projectCard"

type TScreen = "projects" | "shared" | "settings" | "search"

export default function Dashboard() {
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
      <div className="grow p-4 grid lg:grid-cols-4 xl:grid-cols-5 md:grid-cols-3 gap-4">
        <ProjectCard>
          <div className="font-medium flex items-center whitespace-nowrap w-full text-ellipsis overflow-hidden">
            React Project 1
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
      </div>
    </div>
  )
}
