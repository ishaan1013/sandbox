import e from "cors"
import {
  R2FileBody,
  R2Files,
  Sandbox,
  TFile,
  TFileData,
  TFolder,
  User,
} from "./types"

export const getSandboxFiles = async (id: string) => {
  const res = await fetch(
    `https://storage.ishaan1013.workers.dev/api?sandboxId=${id}`
  )
  const data: R2Files = await res.json()

  const paths = data.objects.map((obj) => obj.key)
  const processedFiles = await processFiles(paths, id)
  return processedFiles
}

export const getFolder = async (folderId: string) => {
  const res = await fetch(
    `https://storage.ishaan1013.workers.dev/api?folderId=${folderId}`
  )
  const data: R2Files = await res.json()

  return data.objects.map((obj) => obj.key)
}

const processFiles = async (paths: string[], id: string) => {
  const root: TFolder = { id: "/", type: "folder", name: "/", children: [] }
  const fileData: TFileData[] = []

  paths.forEach((path) => {
    const allParts = path.split("/")
    if (allParts[1] !== id) {
      return
    }

    const parts = allParts.slice(2)
    let current: TFolder = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1 && part.includes(".")
      const existing = current.children.find((child) => child.name === part)

      if (existing) {
        if (!isFile) {
          current = existing as TFolder
        }
      } else {
        if (isFile) {
          const file: TFile = { id: path, type: "file", name: part }
          current.children.push(file)
          fileData.push({ id: path, data: "" })
        } else {
          const folder: TFolder = {
            // id: path, // todo: wrong id. for example, folder "src" ID is: projects/a7vgttfqbgy403ratp7du3ln/src/App.css
            id: `projects/${id}/${parts.slice(0, i + 1).join("/")}`,
            type: "folder",
            name: part,
            children: [],
          }
          current.children.push(folder)
          current = folder
        }
      }
    }
  })

  await Promise.all(
    fileData.map(async (file) => {
      const data = await fetchFileContent(file.id)
      file.data = data
    })
  )

  return {
    files: root.children,
    fileData,
  }
}

const fetchFileContent = async (fileId: string): Promise<string> => {
  try {
    const fileRes = await fetch(
      `https://storage.ishaan1013.workers.dev/api?fileId=${fileId}`
    )
    return await fileRes.text()
  } catch (error) {
    console.error("ERROR fetching file:", error)
    return ""
  }
}

export const createFile = async (fileId: string) => {
  const res = await fetch(`https://storage.ishaan1013.workers.dev/api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId }),
  })
  return res.ok
}

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
  })
  return res.ok
}

export const saveFile = async (fileId: string, data: string) => {
  const res = await fetch(`https://storage.ishaan1013.workers.dev/api/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId, data }),
  })
  return res.ok
}

export const deleteFile = async (fileId: string) => {
  const res = await fetch(`https://storage.ishaan1013.workers.dev/api`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId }),
  })
  return res.ok
}

export const getProjectSize = async (id: string) => {
  const res = await fetch(
    `https://storage.ishaan1013.workers.dev/api/size?sandboxId=${id}`
  )
  return (await res.json()).size
}

export const generateCode = async ({
  fileName,
  code,
  line,
  instructions,
}: {
  fileName: string
  code: string
  line: number
  instructions: string
}) => {
  return await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_USER_ID}/ai/run/@cf/meta/llama-3-8b-instruct`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are an expert coding assistant. You read code from a file, and you suggest new code to add to the file. You may be given instructions on what to generate, which you should follow. You should generate code that is correct, efficient, and follows best practices. You should also generate code that is clear and easy to read. When you generate code, you should only return the code, and nothing else. You should not include backticks in the code you generate.",
          },
          {
            role: "user",
            content: `The file is called ${fileName}.`,
          },
          {
            role: "user",
            content: `Here are my instructions on what to generate: ${instructions}.`,
          },
          {
            role: "user",
            content: `Suggest me code to insert at line ${line} in my file. Give only the code, and NOTHING else. DO NOT include backticks in your response. My code file content is as follows 
            
${code}`,
          },
        ],
      }),
    }
  )
}

export const stopServer = async (sandboxId: string, userId: string) => {
  const res = await fetch("http://localhost:4001/stop", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sandboxId,
      userId
    }),
  })
  const data = await res.json()

  return data
}