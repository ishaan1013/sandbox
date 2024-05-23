import Image from "next/image";
import Logo from "@/assets/logo.svg";
import XLogo from "@/assets/x.svg";
import Button from "@/components/ui/customButton";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function Landing() {
  return (
    <div className="w-screen h-screen flex justify-center overflow-hidden overscroll-none">
      <div className="w-full max-w-screen-md px-8 flex flex-col items-center relative">
        <div className="w-full flex items-center justify-between py-8">
          <div className="flex items-center font-medium">
            <Image
              src={Logo}
              alt="Logo"
              width={36}
              height={36}
              className="mr-2"
            />
          </div>
          <div className="flex items-center space-x-4">
            <a href="https://www.x.com/ishaandey_" target="_blank">
              <Image src={XLogo} alt="X Logo" width={18} height={18} />
            </a>
          </div>
        </div>
        <h1 className="text-2xl font-medium text-center mt-16">
          A Collaborative, AI-Powered, Auto-Scaling Code Editor
        </h1>
        <div className="text-muted-foreground mt-4 text-center ">
          Sandbox is an open-source cloud-based code editing environment with
          custom AI code autocompletion and real-time collaboration. The
          infrastructure runs on Docker and AWS ECS to scale automatically based
          on resource usage.
        </div>
        <div className="mt-8 flex space-x-4">
          <Link href="/sign-up">
            <Button>Go To App</Button>
          </Link>
          <a
            href="https://github.com/ishaan1013/sandbox"
            target="_blank"
            className="group h-9 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            GitHub Repository
            <ChevronRight className="h-4 w-4 ml-1 transition-all group-hover:translate-x-1" />
          </a>
        </div>
        <div className="aspect-video w-full rounded-lg bg-neutral-800 mt-12"></div>
      </div>
    </div>
  );
}
