"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { useState } from "react";

import { Button } from "../ui/button";
import { ChevronRight } from "lucide-react";

export default function AboutModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About this project</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          Sandbox is an open-source cloud-based code editing environment with
          custom AI code autocompletion and real-time collaboration. The
          infrastructure runs on Docker and AWS ECS to scale automatically based
          on resource usage.
        </div>
      </DialogContent>
    </Dialog>
  );
}
