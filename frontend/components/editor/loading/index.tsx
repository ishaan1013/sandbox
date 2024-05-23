import Image from "next/image";
import Logo from "@/assets/logo.svg";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";

export default function Loading({
  didFail = false,
  withNav = false,
  text = "",
  description = "",
}: {
  didFail?: boolean;
  withNav?: boolean;
  text?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (text) {
      setOpen(true);
    }
  }, [text]);

  return (
    <div className="overflow-hidden overscroll-none w-screen flex flex-col justify-center items-center z-0 h-screen bg-background relative">
      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {didFail ? (
                <>
                  <X className="h-4 w-4 mr-2 text-destructive" /> Failed to
                  start server.
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {text}
                </>
              )}
            </DialogTitle>
            {didFail ? (
              <DialogDescription className="pt-2">
                Try again in a minute, or contact @ishaandey_ on Twitter/X if it
                still doesn't work.
              </DialogDescription>
            ) : description ? (
              <DialogDescription className="pt-2">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {withNav ? (
        <div className="h-14 px-2 w-full flex items-center justify-between border-b border-border">
          <div className="flex items-center space-x-4">
            <Image src={Logo} alt="Logo" width={36} height={36} />
            <Skeleton className="w-[100px] h-[24px] rounded-md" />
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton className="w-[64px] h-[36px] rounded-md" />
            <Skeleton className="w-[36px] h-[36px] rounded-full" />
          </div>
        </div>
      ) : null}
      <div className="grow flex w-screen">
        <div className="h-full w-56 select-none flex flex-col text-sm items-start p-2">
          <div className="flex w-full items-center justify-between h-8 mb-1 ">
            <div className="text-muted-foreground">Explorer</div>
            <div className="flex space-x-1">
              <Skeleton className="w-6 h-6 rounded-md" />
              <Skeleton className="w-6 h-6 rounded-md" />
            </div>
          </div>
          <div className="w-full mt-1 flex flex-col">
            <div className="w-full flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        </div>
        <div className="w-full h-full grid grid-cols-5 grid-rows-2 gap-4 p-2">
          <div className="w-full h-full col-span-3 row-span-2 flex items-center justify-center text-xl font-medium text-secondary select-none">
            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
            Loading...
          </div>
          <Skeleton className="w-full h-full col-span-2 rounded-md" />
          <Skeleton className="w-full h-full col-span-2 rounded-md" />
        </div>
      </div>
    </div>
  );
}
