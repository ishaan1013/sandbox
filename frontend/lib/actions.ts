"use server";

import { revalidatePath } from "next/cache";
import ecsClient from "./ecs";
import { CreateServiceCommand, StartTaskCommand } from "@aws-sdk/client-ecs";

export async function createSandbox(body: {
  type: string;
  name: string;
  userId: string;
  visibility: string;
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
  );

  return await res.text();
}

export async function updateSandbox(body: {
  id: string;
  name?: string;
  visibility?: "public" | "private";
}) {
  await fetch("https://database.ishaan1013.workers.dev/api/sandbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  revalidatePath("/dashboard");
}

export async function deleteSandbox(id: string) {
  await fetch(`https://database.ishaan1013.workers.dev/api/sandbox?id=${id}`, {
    method: "DELETE",
  });

  revalidatePath("/dashboard");
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
  );
  const text = await res.text();

  if (res.status !== 200) {
    return { success: false, message: text };
  }

  revalidatePath(`/code/${sandboxId}`);
  return { success: true, message: "Shared successfully." };
}

export async function unshareSandbox(sandboxId: string, userId: string) {
  await fetch("https://database.ishaan1013.workers.dev/api/sandbox/share", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, userId }),
  });

  revalidatePath(`/code/${sandboxId}`);
}

export async function startServer(serviceName: string) {
  const command = new CreateServiceCommand({
    cluster: "arn:aws:ecs:us-east-1:767398085538:service/Sandbox/Sandbox",
    serviceName,
    taskDefinition: "Sandbox1",
    desiredCount: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        securityGroups: ["sg-07e489fcf3299af52"],
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
  });

  try {
    const response = await ecsClient.send(command);
    console.log("started server:", response);
  } catch (error) {
    console.error("Error starting server:", error);
  }
}
