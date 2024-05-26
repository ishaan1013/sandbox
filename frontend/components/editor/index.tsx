"use client"

import dynamic from "next/dynamic"
import Loading from "@/components/editor/loading"
import { Sandbox, User } from "@/lib/types"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getTaskIp, startServer } from "@/lib/actions"
import { checkServiceStatus, setupServer } from "@/lib/utils"

const CodeEditor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
  loading: () => <Loading />,
})

export default function Editor({
  userData,
  sandboxData,
}: {
  userData: User
  sandboxData: Sandbox
}) {
  const isDev = process.env.VERCEL_ENV === "development"

  const [isServiceRunning, setIsServiceRunning] = useState(false)
  const [isDeploymentActive, setIsDeploymentActive] = useState(false)
  const [taskIp, setTaskIp] = useState<string>()
  const [didFail, setDidFail] = useState(false)

  useEffect(() => {
    if (isDev) {
      setIsServiceRunning(true)
      setIsDeploymentActive(true)
      setTaskIp("localhost")
      return
    }

    setupServer({
      sandboxId: sandboxData.id,
      setIsServiceRunning,
      setIsDeploymentActive,
      setTaskIp,
      setDidFail,
      toast,
    })
  }, [])

  if (didFail) return <Loading didFail={didFail} />
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
    )

  return (
    <CodeEditor ip={taskIp} userData={userData} sandboxData={sandboxData} />
  )
}
