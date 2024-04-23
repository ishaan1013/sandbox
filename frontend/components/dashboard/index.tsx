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
import DashboardProjects from "./projects"
import DashboardSharedWithMe from "./shared"
import NewProjectModal from "./newProject"

type TScreen = "projects" | "shared" | "settings" | "search"

export default function Dashboard({ sandboxes }: { sandboxes: Sandbox[] }) {
  const [screen, setScreen] = useState<TScreen>("projects")

  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false)

  const activeScreen = (s: TScreen) => {
    if (screen === s) return "justify-start"
    else return "justify-start font-normal text-muted-foreground"
  }

  return (
    <>
      <NewProjectModal
        open={newProjectModalOpen}
        setOpen={setNewProjectModalOpen}
      />
      <div className="flex grow w-full">
        <div className="w-56 shrink-0 border-r border-border p-4 justify-between flex flex-col">
          <div className="flex flex-col">
            <CustomButton
              onClick={() => setNewProjectModalOpen(true)}
              className="mb-4"
            >
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
              Shared With Me
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
          <DashboardProjects sandboxes={sandboxes} />
        ) : screen === "shared" ? (
          <DashboardSharedWithMe sandboxes={sandboxes} />
        ) : screen === "settings" ? null : null}
      </div>
    </>
  )
}
