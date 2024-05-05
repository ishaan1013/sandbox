"use client"

import CustomButton from "@/components/ui/customButton"
import { Button } from "@/components/ui/button"
import {
  Code2,
  FolderDot,
  HelpCircle,
  Plus,
  Settings,
  Users,
} from "lucide-react"
import { useState } from "react"
import { Sandbox } from "@/lib/types"
import DashboardProjects from "./projects"
import DashboardSharedWithMe from "./shared"
import NewProjectModal from "./newProject"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import AboutModal from "./about"

type TScreen = "projects" | "shared" | "settings" | "search"

export default function Dashboard({
  sandboxes,
  shared,
}: {
  sandboxes: Sandbox[]
  shared: {
    id: string
    name: string
    type: "react" | "node"
    author: string
    sharedOn: Date
  }[]
}) {
  const [screen, setScreen] = useState<TScreen>("projects")

  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false)
  const [aboutModalOpen, setAboutModalOpen] = useState(false)

  const activeScreen = (s: TScreen) => {
    if (screen === s) return "justify-start"
    else return "justify-start font-normal text-muted-foreground"
  }

  const searchParams = useSearchParams()
  const q = searchParams.get("q")

  return (
    <>
      <NewProjectModal
        open={newProjectModalOpen}
        setOpen={setNewProjectModalOpen}
      />
      <AboutModal open={aboutModalOpen} setOpen={setAboutModalOpen} />
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
            {/* <Button
              variant="ghost"
              onClick={() => setScreen("settings")}
              className={activeScreen("settings")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button> */}
          </div>
          <div className="flex flex-col">
            <Link href="https://github.com/ishaan1013/sandbox">
              <Button
                variant="ghost"
                className="justify-start font-normal text-muted-foreground"
              >
                <Code2 className="w-4 h-4 mr-2" />
                GitHub Repository
              </Button>
            </Link>
            <Button
              onClick={() => setAboutModalOpen(true)}
              variant="ghost"
              className="justify-start font-normal text-muted-foreground"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              About
            </Button>
          </div>
        </div>
        {screen === "projects" ? (
          <DashboardProjects sandboxes={sandboxes} q={q} />
        ) : screen === "shared" ? (
          <DashboardSharedWithMe shared={shared} />
        ) : screen === "settings" ? null : null}
      </div>
    </>
  )
}
