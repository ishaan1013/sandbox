"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import ProjectCardDropdown from "./dropdown";
import { Clock, Globe, Lock } from "lucide-react";
import { Sandbox } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function ProjectCard({
  children,
  sandbox,
  onVisibilityChange,
  onDelete,
  deletingId,
}: {
  children?: React.ReactNode;
  sandbox: Sandbox;
  onVisibilityChange: (sandbox: Sandbox) => void;
  onDelete: (sandbox: Sandbox) => void;
  deletingId: string;
}) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  return (
    <Card
      tabIndex={0}
      onClick={() => router.push(`/code/${sandbox.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group/canvas-card p-4 h-48 flex flex-col justify-between items-start hover:border-muted-foreground/50 relative overflow-hidden transition-all`}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full absolute inset-0"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-x-2 flex items-center justify-start w-full z-10">
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
        <ProjectCardDropdown
          sandbox={sandbox}
          onVisibilityChange={onVisibilityChange}
          onDelete={onDelete}
        />
      </div>
      <div className="flex flex-col text-muted-foreground space-y-0.5 text-sm z-10">
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
    </Card>
  );
}
