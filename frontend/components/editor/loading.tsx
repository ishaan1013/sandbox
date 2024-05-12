import Image from "next/image";
import Logo from "@/assets/logo.svg";
import { Skeleton } from "../ui/skeleton";
import { Loader, Loader2 } from "lucide-react";

export default function Loading({ withNav = false }: { withNav?: boolean }) {
  return (
    <div className="overflow-hidden overscroll-none w-screen flex flex-col h-screen bg-background">
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
