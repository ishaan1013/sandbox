"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ChevronRight, FileStack, Globe, TextCursor } from "lucide-react";

export default function DisableAccessModal({
  open,
  setOpen,
  message,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  message: string;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Live Collaboration Disabled</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">{message}</div>
      </DialogContent>
    </Dialog>
  );
}
