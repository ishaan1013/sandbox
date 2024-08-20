"use client";

import { Sandbox } from "@/lib/types";
import ProjectCard from "./projectCard";
import Image from "next/image";
import ProjectCardDropdown from "./projectCard/dropdown";
import { Clock, Globe, Lock } from "lucide-react";
import Link from "next/link";
import { Card } from "../ui/card";
import { deleteSandbox, updateSandbox } from "@/lib/actions";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { CanvasRevealEffect } from "./projectCard/revealEffect";

const colors: { [key: string]: number[][] } = {
  react: [
    [71, 207, 237],
    [30, 126, 148],
  ],
  node: [
    [86, 184, 72],
    [59, 112, 52],
  ],
};

export default function DashboardProjects({
  sandboxes,
  q,
}: {
  sandboxes: Sandbox[];
  q: string | null;
}) {
  const [deletingId, setDeletingId] = useState<string>("");

  const onDelete = async (sandbox: Sandbox) => {
    setDeletingId(sandbox.id);
    toast(`Project ${sandbox.name} deleted.`);
    await deleteSandbox(sandbox.id);
  };

  useEffect(() => {
    if (deletingId) {
      setDeletingId("");
    }
  }, [sandboxes]);

  const onVisibilityChange = async (sandbox: Sandbox) => {
    const newVisibility =
      sandbox.visibility === "public" ? "private" : "public";
    toast(`Project ${sandbox.name} is now ${newVisibility}.`);
    await updateSandbox({
      id: sandbox.id,
      visibility: newVisibility,
    });
  };

  return (
    <div className="grow p-4 flex flex-col">
      <div className="text-xl font-medium mb-8">
        {q && q.length > 0 ? `Showing search results for: ${q}` : "My Projects"}
      </div>
      <div className="grow w-full ">
        {sandboxes.length > 0 ? (
          <div className="w-full grid lg:grid-cols-3 2xl:grid-cols-4 md:grid-cols-2 gap-4">
            {sandboxes.map((sandbox) => {
              if (q && q.length > 0) {
                if (!sandbox.name.toLowerCase().includes(q.toLowerCase())) {
                  return null;
                }
              }
              return (
                <Link
                  key={sandbox.id}
                  href={`/code/${sandbox.id}`}
                  className={`${
                    deletingId === sandbox.id
                      ? "pointer-events-none opacity-50 cursor-events-none"
                      : "cursor-pointer"
                  } transition-all focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-ring rounded-lg`}
                >
                  <ProjectCard
                    sandbox={sandbox}
                    onVisibilityChange={onVisibilityChange}
                    onDelete={onDelete}
                    deletingId={deletingId}
                  >
                    <CanvasRevealEffect
                      animationSpeed={3}
                      containerClassName="bg-black"
                      colors={colors[sandbox.type]}
                      dotSize={2}
                    />
                    <div className="absolute inset-0 [mask-image:radial-gradient(400px_at_center,white,transparent)] bg-background/75" />
                  </ProjectCard>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            You don't have any projects yet. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
