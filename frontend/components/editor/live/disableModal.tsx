"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  ChevronRight,
  FileStack,
  Globe,
  Loader2,
  TextCursor,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DisableAccessModal({
  open,
  setOpen,
  message,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  message: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (open) {
      const timeout = setTimeout(() => {
        router.push("/dashboard");
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Live Collaboration Disabled</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-2">
          <div>{message}</div>
          <div className="flex items-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Redirecting you to dashboard...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
