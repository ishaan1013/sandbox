"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/editor/loading";
import { Sandbox, User } from "@/lib/types";
import { useEffect, useState } from "react";
import { startServer } from "@/lib/utils";
import { toast } from "sonner";

const CodeEditor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function Editor({
  userData,
  sandboxData,
}: {
  userData: User;
  sandboxData: Sandbox;
}) {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [didFail, setDidFail] = useState(false);

  useEffect(() => {
    startServer(sandboxData.id, userData.id, (success: boolean) => {
      if (!success) {
        toast.error("Failed to start server.");
        setDidFail(true);
      } else {
        setIsServerRunning(true);
      }
    });

    // return () => {
    //   stopServer(sandboxData.id, userData.id);
    // };
  }, []);

  if (!isServerRunning)
    return <Loading didFail={didFail} text="Creating your sandbox resources" />;

  return <CodeEditor userData={userData} sandboxData={sandboxData} />;
}
