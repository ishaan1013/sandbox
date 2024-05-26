"use server"

import { revalidatePath } from "next/cache"
import ecsClient, { ec2Client } from "./ecs"
import {
  CreateServiceCommand,
  DescribeClustersCommand,
  DescribeServicesCommand,
  DescribeTasksCommand,
  ListTasksCommand,
} from "@aws-sdk/client-ecs"
import { DescribeNetworkInterfacesCommand } from "@aws-sdk/client-ec2"

export async function createSandbox(body: {
  type: string
  name: string
  userId: string
  visibility: string
}) {
  const res = await fetch(
    "https://database.ishaan1013.workers.dev/api/sandbox",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  return await res.text()
}

export async function updateSandbox(body: {
  id: string
  name?: string
  visibility?: "public" | "private"
}) {
  await fetch("https://database.ishaan1013.workers.dev/api/sandbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  revalidatePath("/dashboard")
}

export async function deleteSandbox(id: string) {
  await fetch(`https://database.ishaan1013.workers.dev/api/sandbox?id=${id}`, {
    method: "DELETE",
  })

  revalidatePath("/dashboard")
}

export async function shareSandbox(sandboxId: string, email: string) {
  const res = await fetch(
    "https://database.ishaan1013.workers.dev/api/sandbox/share",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sandboxId, email }),
    }
  )
  const text = await res.text()

  if (res.status !== 200) {
    return { success: false, message: text }
  }

  revalidatePath(`/code/${sandboxId}`)
  return { success: true, message: "Shared successfully." }
}

export async function unshareSandbox(sandboxId: string, userId: string) {
  await fetch("https://database.ishaan1013.workers.dev/api/sandbox/share", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, userId }),
  })

  revalidatePath(`/code/${sandboxId}`)
}

export async function describeService(serviceName: string) {
  const command = new DescribeServicesCommand({
    cluster: process.env.NEXT_PUBLIC_AWS_ECS_CLUSTER!,
    services: [serviceName],
  })

  return await ecsClient.send(command)
}

export async function getTaskIp(serviceName: string) {
  const listCommand = new ListTasksCommand({
    cluster: process.env.NEXT_PUBLIC_AWS_ECS_CLUSTER!,
    serviceName,
  })

  const listResponse = await ecsClient.send(listCommand)
  const taskArns = listResponse.taskArns

  const describeCommand = new DescribeTasksCommand({
    cluster: process.env.NEXT_PUBLIC_AWS_ECS_CLUSTER!,
    tasks: taskArns,
  })

  const describeResponse = await ecsClient.send(describeCommand)
  const tasks = describeResponse.tasks
  const taskAttachment = tasks?.[0].attachments?.[0].details
  if (!taskAttachment) {
    throw new Error("Task attachment not found")
  }

  const eni = taskAttachment.find(
    (detail) => detail.name === "networkInterfaceId"
  )?.value
  if (!eni) {
    throw new Error("Network interface not found")
  }

  const describeNetworkInterfacesCommand = new DescribeNetworkInterfacesCommand(
    {
      NetworkInterfaceIds: [eni],
    }
  )
  const describeNetworkInterfacesResponse = await ec2Client.send(
    describeNetworkInterfacesCommand
  )

  const ip =
    describeNetworkInterfacesResponse.NetworkInterfaces?.[0].Association
      ?.PublicIp
  if (!ip) {
    throw new Error("Public IP not found")
  }

  return ip
}

export async function doesServiceExist(serviceName: string) {
  const response = await describeService(serviceName)
  const activeServices = response.services?.filter(
    (service) => service.status === "ACTIVE"
  )

  console.log("activeServices: ", activeServices)

  return activeServices?.length === 1
}

async function countServices() {
  const command = new DescribeClustersCommand({
    clusters: [process.env.NEXT_PUBLIC_AWS_ECS_CLUSTER!],
  })

  const response = await ecsClient.send(command)
  return response.clusters?.[0].activeServicesCount!
}

export async function startServer(
  serviceName: string
): Promise<{ success: boolean; message: string }> {
  const serviceExists = await doesServiceExist(serviceName)
  if (serviceExists) {
    return { success: true, message: "" }
  }

  const activeServices = await countServices()
  if (activeServices >= 100) {
    return {
      success: false,
      message:
        "Too many servers are running! Please try again later or contact @ishaandey_ on Twitter/X.",
    }
  }

  const command = new CreateServiceCommand({
    cluster: process.env.NEXT_PUBLIC_AWS_ECS_CLUSTER!,
    serviceName,
    taskDefinition: "Sandbox1",
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        securityGroups: [process.env.AWS_ECS_SECURITY_GROUP!],
        subnets: [
          "subnet-06d04f2a6ebb1710c",
          "subnet-097c000f157c26a78",
          "subnet-00f931ecbabaf87dd",
          "subnet-0adcb82d77db9f263",
          "subnet-0c6874150d8e63a7c",
          "subnet-0b76f9ee3fe20660d",
        ],
        assignPublicIp: "ENABLED",
      },
    },
  })

  try {
    const response = await ecsClient.send(command)
    console.log("started server:", response.service?.serviceName)

    return { success: true, message: "" }

    // store in workers kv:
    // {
    //   userId: {
    //     sandboxId,
    //     serviceName,
    //     startedAt,

    //   }
    // }
  } catch (error: any) {
    // console.error("Error starting server:", error.message);
    return {
      success: false,
      message: `Error starting server: ${error.message}. Try again in a minute, or contact @ishaandey_ on Twitter/X if it still doesn't work.`,
    }
  }
}
