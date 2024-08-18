"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTerminal } from "@/context/TerminalContext";
import { Play, Pause, Globe, Globe2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sandbox, User } from "@/lib/types";

export default function DeployButtonModal({
  userData,
  data,
}: {
  userData: User;
  data: Sandbox;
}) {
  const { deploy } = useTerminal();
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = () => {
    if (isDeploying) {
      console.log("Stopping deployment...");
      setIsDeploying(false);
    } else {
      console.log("Starting deployment...");
      setIsDeploying(true);
      deploy(() => {
        setIsDeploying(false);
      });
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <Globe className="w-4 h-4 mr-2" />
            Deploy
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-4 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg shadow-lg" style={{ backgroundColor: 'rgb(10,10,10)', color: 'white' }}>
          <h3 className="font-semibold text-gray-300 mb-2">Domains</h3>
          <div className="flex flex-col gap-4">
            <DeploymentOption
              icon={<Globe className="text-gray-500 w-5 h-5" />}
              domain={`${data.id}.gitwit.app`}
              timestamp="Deployed 1h ago"
              user={userData.name}
            />
          </div>
          <Button variant="outline" className="mt-4 w-full bg-[#0a0a0a] text-white hover:bg-[#262626]" onClick={handleDeploy}>
          {isDeploying ? "Deploying..." : "Update"}
          </Button>
        </PopoverContent>
      </Popover>
    </>
  );
}

function DeploymentOption({ icon, domain, timestamp, user }: { icon: React.ReactNode; domain: string; timestamp: string; user: string }) {
  return (
    <div className="flex flex-col gap-2 w-full text-left p-2 rounded-md border border-gray-700 bg-gray-900">
      <div className="flex items-start gap-2 relative">
        <div className="flex-shrink-0">{icon}</div>
        <a
          href={`https://${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gray-300 hover:underline"
        >
          {domain}
        </a>
      </div>
      <p className="text-sm text-gray-400 mt-0 ml-7">{timestamp} • {user}</p>
    </div>
  );
}
