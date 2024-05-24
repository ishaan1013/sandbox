import * as dotenv from "dotenv";
import {
  R2FileBody,
  R2Files,
  Sandbox,
  TFile,
  TFileData,
  TFolder,
  User,
} from "./types";

import {
  DeleteServiceCommand,
  DescribeServicesCommand,
  ECSClient,
} from "@aws-sdk/client-ecs";

dotenv.config();

const client = new ECSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const testDescribe = async () => {
  const command = new DescribeServicesCommand({
    cluster: "Sandbox",
    services: ["Sandbox"],
  });
  const response = await client.send(command);
  console.log("describing: ", response);
  return response;
};

export const getSandboxFiles = async (id: string) => {
  const res = await fetch(
    `https://storage.ishaan1013.workers.dev/api?sandboxId=${id}`
  );
  const data: R2Files = await res.json();

  const paths = data.objects.map((obj) => obj.key);
  const processedFiles = await processFiles(paths, id);
  return processedFiles;
};

export const getFolder = async (folderId: string) => {
  const res = await fetch(
    `https://storage.ishaan1013.workers.dev/api?folderId=${folderId}`
  );
  const data: R2Files = await res.json();

  return data.objects.map((obj) => obj.key);
};

const processFiles = async (paths: string[], id: string) => {
  const root: TFolder = { id: "/", type: "folder", name: "/", children: [] };
  const fileData: TFileData[] = [];

  paths.forEach((path) => {
    const allParts = path.split("/");
    if (allParts[1] !== id) {
      return;
    }

    const parts = allParts.slice(2);
    let current: TFolder = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1 && part.includes(".");
      const existing = current.children.find((child) => child.name === part);

      if (existing) {
        if (!isFile) {
          current = existing as TFolder;
        }
      } else {
        if (isFile) {
          const file: TFile = { id: path, type: "file", name: part };
          current.children.push(file);
          fileData.push({ id: path, data: "" });
        } else {
          const folder: TFolder = {
            // id: path, // todo: wrong id. for example, folder "src" ID is: projects/a7vgttfqbgy403ratp7du3ln/src/App.css
            id: `projects/${id}/${parts.slice(0, i + 1).join("/")}`,
            type: "folder",
            name: part,
            children: [],
          };
          current.children.push(folder);
          current = folder;
        }
      }
    }
  });

  await Promise.all(
    fileData.map(async (file) => {
      const data = await fetchFileContent(file.id);
      file.data = data;
    })
  );

  return {
    files: root.children,
    fileData,
  };
};

const fetchFileContent = async (fileId: string): Promise<string> => {
  try {
    const fileRes = await fetch(
      `https://storage.ishaan1013.workers.dev/api?fileId=${fileId}`
    );
    return await fileRes.text();
  } catch (error) {
    console.error("ERROR fetching file:", error);
    return "";
  }
};

export const createFile = async (fileId: string) => {
  const res = await fetch(`https://storage.ishaan1013.workers.dev/api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId }),
  });
  return res.ok;
};

export const renameFile = async (
  fileId: string,
  newFileId: string,
  data: string
) => {
  const res = await fetch(`https://storage.ishaan1013.workers.dev/api/rename`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId, newFileId, data }),
  });
  return res.ok;
};

export const saveFile = async (fileId: string, data: string) => {
  const res = await fetch(`https://storage.ishaan1013.workers.dev/api/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId, data }),
  });
  return res.ok;
};

export const deleteFile = async (fileId: string) => {
  const res = await fetch(`https://storage.ishaan1013.workers.dev/api`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId }),
  });
  return res.ok;
};

export const getProjectSize = async (id: string) => {
  const res = await fetch(
    `https://storage.ishaan1013.workers.dev/api/size?sandboxId=${id}`
  );
  return (await res.json()).size;
};

export const stopServer = async (service: string) => {
  const command = new DeleteServiceCommand({
    cluster: process.env.AWS_ECS_CLUSTER!,
    service,
    force: true,
  });

  try {
    const response = await client.send(command);
    return response;
  } catch (error) {
    console.error("Error stopping server:", error);
  }
};
