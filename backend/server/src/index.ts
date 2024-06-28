import os from "os";
import path from "path";
import cors from "cors";
import express, { Express } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import { z } from "zod";
import { User } from "./types";
import {
  createFile,
  deleteFile,
  getFolder,
  getProjectSize,
  getSandboxFiles,
  renameFile,
  saveFile,
} from "./fileoperations";
import { LockManager } from "./utils";
import { Sandbox, Terminal, FilesystemManager } from "e2b";
import {
  MAX_BODY_SIZE,
  createFileRL,
  createFolderRL,
  deleteFileRL,
  renameFileRL,
  saveFileRL,
} from "./ratelimit";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 4000;
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

let inactivityTimeout: NodeJS.Timeout | null = null;
let isOwnerConnected = false;

const containers: Record<string, Sandbox> = {};
const connections: Record<string, number> = {};
const terminals: Record<string, Terminal> = {};

const dirName = "/home/user";

const moveFile = async (
  filesystem: FilesystemManager,
  filePath: string,
  newFilePath: string
) => {
  const fileContents = await filesystem.readBytes(filePath);
  await filesystem.writeBytes(newFilePath, fileContents);
  await filesystem.remove(filePath);
};

io.use(async (socket, next) => {
  const handshakeSchema = z.object({
    userId: z.string(),
    sandboxId: z.string(),
    EIO: z.string(),
    transport: z.string(),
  });

  const q = socket.handshake.query;
  const parseQuery = handshakeSchema.safeParse(q);

  if (!parseQuery.success) {
    next(new Error("Invalid request."));
    return;
  }

  const { sandboxId, userId } = parseQuery.data;
  const dbUser = await fetch(
    `${process.env.DATABASE_WORKER_URL}/api/user?id=${userId}`,
    {
      headers: {
        Authorization: `${process.env.WORKERS_KEY}`,
      },
    }
  );
  const dbUserJSON = (await dbUser.json()) as User;

  if (!dbUserJSON) {
    next(new Error("DB error."));
    return;
  }

  const sandbox = dbUserJSON.sandbox.find((s) => s.id === sandboxId);
  const sharedSandboxes = dbUserJSON.usersToSandboxes.find(
    (uts) => uts.sandboxId === sandboxId
  );

  if (!sandbox && !sharedSandboxes) {
    next(new Error("Invalid credentials."));
    return;
  }

  socket.data = {
    userId,
    sandboxId: sandboxId,
    isOwner: sandbox !== undefined,
  };

  next();
});

const lockManager = new LockManager();

io.on("connection", async (socket) => {
  try {
    if (inactivityTimeout) clearTimeout(inactivityTimeout);

    const data = socket.data as {
      userId: string;
      sandboxId: string;
      isOwner: boolean;
    };

    if (data.isOwner) {
      isOwnerConnected = true;
      connections[data.sandboxId] = (connections[data.sandboxId] ?? 0) + 1;
    } else {
      if (!isOwnerConnected) {
        socket.emit("disableAccess", "The sandbox owner is not connected.");
        return;
      }
    }

    await lockManager.acquireLock(data.sandboxId, async () => {
      try {
        if (!containers[data.sandboxId]) {
          containers[data.sandboxId] = await Sandbox.create();
          console.log("Created container ", data.sandboxId);
          io.emit(
            "previewURL",
            "https://" + containers[data.sandboxId].getHostname(5173)
          );
        }
      } catch (e: any) {
        console.error(`Error creating container ${data.sandboxId}:`, e);
        io.emit("error", `Error: container creation. ${e.message ?? e}`);
      }
    });

    // Change the owner of the project directory to user
    const fixPermissions = async () => {
      await containers[data.sandboxId].process.startAndWait(
        `sudo chown -R user "${path.join(dirName, "projects", data.sandboxId)}"`
      );
    };

    const sandboxFiles = await getSandboxFiles(data.sandboxId);
    sandboxFiles.fileData.forEach(async (file) => {
      const filePath = path.join(dirName, file.id);
      await containers[data.sandboxId].filesystem.makeDir(
        path.dirname(filePath)
      );
      await containers[data.sandboxId].filesystem.write(filePath, file.data);
    });
    fixPermissions();

    socket.emit("loaded", sandboxFiles.files);

    socket.on("getFile", (fileId: string, callback) => {
      console.log(fileId);
      try {
        const file = sandboxFiles.fileData.find((f) => f.id === fileId);
        if (!file) return;

        callback(file.data);
      } catch (e: any) {
        console.error("Error getting file:", e);
        io.emit("error", `Error: get file. ${e.message ?? e}`);
      }
    });

    socket.on("getFolder", async (folderId: string, callback) => {
      try {
        const files = await getFolder(folderId);
        callback(files);
      } catch (e: any) {
        console.error("Error getting folder:", e);
        io.emit("error", `Error: get folder. ${e.message ?? e}`);
      }
    });

    // todo: send diffs + debounce for efficiency
    socket.on("saveFile", async (fileId: string, body: string) => {
      if (!fileId) return; // handles saving when no file is open

      try {
        if (Buffer.byteLength(body, "utf-8") > MAX_BODY_SIZE) {
          socket.emit(
            "error",
            "Error: file size too large. Please reduce the file size."
          );
          return;
        }
        try {
          await saveFileRL.consume(data.userId, 1);
          await saveFile(fileId, body);
        } catch (e) {
          io.emit("error", "Rate limited: file saving. Please slow down.");
          return;
        }

        const file = sandboxFiles.fileData.find((f) => f.id === fileId);
        if (!file) return;
        file.data = body;

        await containers[data.sandboxId].filesystem.write(
          path.join(dirName, file.id),
          body
        );
        fixPermissions();
      } catch (e: any) {
        console.error("Error saving file:", e);
        io.emit("error", `Error: file saving. ${e.message ?? e}`);
      }
    });

    socket.on(
      "moveFile",
      async (fileId: string, folderId: string, callback) => {
        try {
          const file = sandboxFiles.fileData.find((f) => f.id === fileId);
          if (!file) return;

          const parts = fileId.split("/");
          const newFileId = folderId + "/" + parts.pop();

          await moveFile(
            containers[data.sandboxId].filesystem,
            path.join(dirName, fileId),
            path.join(dirName, newFileId)
          );
          fixPermissions();

          file.id = newFileId;

          await renameFile(fileId, newFileId, file.data);
          const newFiles = await getSandboxFiles(data.sandboxId);
          callback(newFiles.files);
        } catch (e: any) {
          console.error("Error moving file:", e);
          io.emit("error", `Error: file moving. ${e.message ?? e}`);
        }
      }
    );

    socket.on("createFile", async (name: string, callback) => {
      try {
        const size: number = await getProjectSize(data.sandboxId);
        // limit is 200mb
        if (size > 200 * 1024 * 1024) {
          io.emit(
            "error",
            "Rate limited: project size exceeded. Please delete some files."
          );
          callback({ success: false });
          return;
        }

        try {
          await createFileRL.consume(data.userId, 1);
        } catch (e) {
          io.emit("error", "Rate limited: file creation. Please slow down.");
          return;
        }

        const id = `projects/${data.sandboxId}/${name}`;

        await containers[data.sandboxId].filesystem.write(
          path.join(dirName, id),
          ""
        );
        fixPermissions();

        sandboxFiles.files.push({
          id,
          name,
          type: "file",
        });

        sandboxFiles.fileData.push({
          id,
          data: "",
        });

        await createFile(id);

        callback({ success: true });
      } catch (e: any) {
        console.error("Error creating file:", e);
        io.emit("error", `Error: file creation. ${e.message ?? e}`);
      }
    });

    socket.on("createFolder", async (name: string, callback) => {
      try {
        try {
          await createFolderRL.consume(data.userId, 1);
        } catch (e) {
          io.emit("error", "Rate limited: folder creation. Please slow down.");
          return;
        }

        const id = `projects/${data.sandboxId}/${name}`;

        await containers[data.sandboxId].filesystem.makeDir(
          path.join(dirName, id)
        );

        callback();
      } catch (e: any) {
        console.error("Error creating folder:", e);
        io.emit("error", `Error: folder creation. ${e.message ?? e}`);
      }
    });

    socket.on("renameFile", async (fileId: string, newName: string) => {
      try {
        try {
          await renameFileRL.consume(data.userId, 1);
        } catch (e) {
          io.emit("error", "Rate limited: file renaming. Please slow down.");
          return;
        }

        const file = sandboxFiles.fileData.find((f) => f.id === fileId);
        if (!file) return;
        file.id = newName;

        const parts = fileId.split("/");
        const newFileId =
          parts.slice(0, parts.length - 1).join("/") + "/" + newName;

        await moveFile(
          containers[data.sandboxId].filesystem,
          path.join(dirName, fileId),
          path.join(dirName, newFileId)
        );
        fixPermissions();
        await renameFile(fileId, newFileId, file.data);
      } catch (e: any) {
        console.error("Error renaming folder:", e);
        io.emit("error", `Error: folder renaming. ${e.message ?? e}`);
      }
    });

    socket.on("deleteFile", async (fileId: string, callback) => {
      try {
        try {
          await deleteFileRL.consume(data.userId, 1);
        } catch (e) {
          io.emit("error", "Rate limited: file deletion. Please slow down.");
        }

        const file = sandboxFiles.fileData.find((f) => f.id === fileId);
        if (!file) return;

        await containers[data.sandboxId].filesystem.remove(
          path.join(dirName, fileId)
        );
        sandboxFiles.fileData = sandboxFiles.fileData.filter(
          (f) => f.id !== fileId
        );

        await deleteFile(fileId);

        const newFiles = await getSandboxFiles(data.sandboxId);
        callback(newFiles.files);
      } catch (e: any) {
        console.error("Error deleting file:", e);
        io.emit("error", `Error: file deletion. ${e.message ?? e}`);
      }
    });

    // todo
    // socket.on("renameFolder", async (folderId: string, newName: string) => {
    // });

    socket.on("deleteFolder", async (folderId: string, callback) => {
      try {
        const files = await getFolder(folderId);

        await Promise.all(
          files.map(async (file) => {
            await containers[data.sandboxId].filesystem.remove(
              path.join(dirName, file)
            );

            sandboxFiles.fileData = sandboxFiles.fileData.filter(
              (f) => f.id !== file
            );

            await deleteFile(file);
          })
        );

        const newFiles = await getSandboxFiles(data.sandboxId);

        callback(newFiles.files);
      } catch (e: any) {
        console.error("Error deleting folder:", e);
        io.emit("error", `Error: folder deletion. ${e.message ?? e}`);
      }
    });

    socket.on("createTerminal", async (id: string, callback) => {
      try {
        if (terminals[id] || Object.keys(terminals).length >= 4) {
          return;
        }

        await lockManager.acquireLock(data.sandboxId, async () => {
          try {
            terminals[id] = await containers[data.sandboxId].terminal.start({
              onData: (data: string) => {
                io.emit("terminalResponse", { id, data });
              },
              size: { cols: 80, rows: 20 },
              onExit: () => console.log("Terminal exited", id),
            });
            await terminals[id].sendData(
              `cd "${path.join(dirName, "projects", data.sandboxId)}"\r`
            );
            await terminals[id].sendData("export PS1='user> '\rclear\r");
            console.log("Created terminal", id);
          } catch (e: any) {
            console.error(`Error creating terminal ${id}:`, e);
            io.emit("error", `Error: terminal creation. ${e.message ?? e}`);
          }
        });

        callback();
      } catch (e: any) {
        console.error(`Error creating terminal ${id}:`, e);
        io.emit("error", `Error: terminal creation. ${e.message ?? e}`);
      }
    });

    socket.on(
      "resizeTerminal",
      (dimensions: { cols: number; rows: number }) => {
        try {
          Object.values(terminals).forEach((t) => {
            t.resize(dimensions);
          });
        } catch (e: any) {
          console.error("Error resizing terminal:", e);
          io.emit("error", `Error: terminal resizing. ${e.message ?? e}`);
        }
      }
    );

    socket.on("terminalData", (id: string, data: string) => {
      try {
        if (!terminals[id]) {
          return;
        }

        terminals[id].sendData(data);
      } catch (e: any) {
        console.error("Error writing to terminal:", e);
        io.emit("error", `Error: writing to terminal. ${e.message ?? e}`);
      }
    });

    socket.on("closeTerminal", async (id: string, callback) => {
      try {
        if (!terminals[id]) {
          return;
        }

        await terminals[id].kill();
        delete terminals[id];

        callback();
      } catch (e: any) {
        console.error("Error closing terminal:", e);
        io.emit("error", `Error: closing terminal. ${e.message ?? e}`);
      }
    });

    socket.on(
      "generateCode",
      async (
        fileName: string,
        code: string,
        line: number,
        instructions: string,
        callback
      ) => {
        try {
          const fetchPromise = fetch(
            `${process.env.DATABASE_WORKER_URL}/api/sandbox/generate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `${process.env.WORKERS_KEY}`,
              },
              body: JSON.stringify({
                userId: data.userId,
              }),
            }
          );

          // Generate code from cloudflare workers AI
          const generateCodePromise = fetch(
            `${process.env.AI_WORKER_URL}/api?fileName=${fileName}&code=${code}&line=${line}&instructions=${instructions}`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `${process.env.CF_AI_KEY}`,
              },
            }
          );

          const [fetchResponse, generateCodeResponse] = await Promise.all([
            fetchPromise,
            generateCodePromise,
          ]);

          const json = await generateCodeResponse.json();

          callback({ response: json.response, success: true });
        } catch (e: any) {
          console.error("Error generating code:", e);
          io.emit("error", `Error: code generation. ${e.message ?? e}`);
        }
      }
    );

    socket.on("disconnect", async () => {
      try {
        if (data.isOwner) {
          connections[data.sandboxId]--;
        }

        if (data.isOwner && connections[data.sandboxId] <= 0) {
          await Promise.all(
            Object.entries(terminals).map(async ([key, terminal]) => {
              await terminal.kill();
              delete terminals[key];
            })
          );

          await lockManager.acquireLock(data.sandboxId, async () => {
            try {
              if (containers[data.sandboxId]) {
                await containers[data.sandboxId].close();
                delete containers[data.sandboxId];
                console.log("Closed container", data.sandboxId);
              }
            } catch (error) {
              console.error("Error closing container ", data.sandboxId, error);
            }
          });

          socket.broadcast.emit(
            "disableAccess",
            "The sandbox owner has disconnected."
          );
        }

        // const sockets = await io.fetchSockets();
        // if (inactivityTimeout) {
        //   clearTimeout(inactivityTimeout);
        // }
        // if (sockets.length === 0) {
        //   console.log("STARTING TIMER");
        //   inactivityTimeout = setTimeout(() => {
        //     io.fetchSockets().then(async (sockets) => {
        //       if (sockets.length === 0) {
        //         console.log("Server stopped", res);
        //       }
        //     });
        //   }, 20000);
        // } else {
        //   console.log("number of sockets", sockets.length);
        // }
      } catch (e: any) {
        console.log("Error disconnecting:", e);
        io.emit("error", `Error: disconnecting. ${e.message ?? e}`);
      }
    });
  } catch (e: any) {
    console.error("Error connecting:", e);
    io.emit("error", `Error: connection. ${e.message ?? e}`);
  }
});

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
