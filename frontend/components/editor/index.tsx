"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/editor/loading";
import { Sandbox, User } from "@/lib/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getTaskIp, startServer } from "@/lib/actions";
import { checkServiceStatus } from "@/lib/utils";

const CodeEditor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function Editor({
  isOwner,
  userData,
  sandboxData,
}: {
  isOwner: boolean;
  userData: User;
  sandboxData: Sandbox;
}) {
  const [isServiceRunning, setIsServiceRunning] = useState(false);
  const [isDeploymentActive, setIsDeploymentActive] = useState(false);
  const [taskIp, setTaskIp] = useState<string>();
  const [didFail, setDidFail] = useState(false);

  useEffect(() => {
    if (!isOwner) {
      toast.error("You are not the owner of this sandbox. (TEMPORARY)");
      setDidFail(true);
      return;
    }

    startServer(sandboxData.id).then((response) => {
      if (!response.success) {
        toast.error(response.message);
        setDidFail(true);
      } else {
        setIsServiceRunning(true);

        checkServiceStatus(sandboxData.id)
          .then(() => {
            setIsDeploymentActive(true);

            getTaskIp(sandboxData.id)
              .then((ip) => {
                setTaskIp(ip);
              })
              .catch(() => {
                setDidFail(true);
                toast.error("An error occurred while getting your server IP.");
              });
          })
          .catch(() => {
            toast.error("An error occurred while initializing your server.");
            setDidFail(true);
          });
      }
    });
  }, []);

  if (didFail) return <Loading didFail={didFail} />;
  if (!isServiceRunning || !isDeploymentActive || !taskIp)
    return (
      <Loading
        text="Creating sandbox resources"
        description={
          isDeploymentActive
            ? "Preparing server networking..."
            : isServiceRunning
            ? "Initializing server, this could take a minute..."
            : "Requesting your server creation..."
        }
      />
    );

  return (
    <CodeEditor ip={taskIp} userData={userData} sandboxData={sandboxData} />
  );
}
