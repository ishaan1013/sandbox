import fs from "fs";
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
import { Sandbox, Terminal } from "e2b";
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

const dirName = path.join(__dirname, "..");

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
      }
    } catch (error) {
      console.error("Error creating container ", data.sandboxId, error);
    }
  });

  const sandboxFiles = await getSandboxFiles(data.sandboxId);
  sandboxFiles.fileData.forEach((file) => {
    const filePath = path.join(dirName, file.id);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFile(filePath, file.data, function (err) {
      if (err) throw err;
    });
  });

  socket.emit("loaded", sandboxFiles.files);

  socket.on("getFile", (fileId: string, callback) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId);
    if (!file) return;

    callback(file.data);
  });

  socket.on("getFolder", async (folderId: string, callback) => {
    const files = await getFolder(folderId);
    callback(files);
  });

  // todo: send diffs + debounce for efficiency
  socket.on("saveFile", async (fileId: string, body: string) => {
    try {
      await saveFileRL.consume(data.userId, 1);

      if (Buffer.byteLength(body, "utf-8") > MAX_BODY_SIZE) {
        socket.emit(
          "rateLimit",
          "Rate limited: file size too large. Please reduce the file size."
        );
        return;
      }

      const file = sandboxFiles.fileData.find((f) => f.id === fileId);
      if (!file) return;
      file.data = body;

      fs.writeFile(path.join(dirName, file.id), body, function (err) {
        if (err) throw err;
      });
      await saveFile(fileId, body);
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file saving. Please slow down.");
    }
  });

  socket.on("moveFile", async (fileId: string, folderId: string, callback) => {
    const file = sandboxFiles.fileData.find((f) => f.id === fileId);
    if (!file) return;

    const parts = fileId.split("/");
    const newFileId = folderId + "/" + parts.pop();

    fs.rename(
      path.join(dirName, fileId),
      path.join(dirName, newFileId),
      function (err) {
        if (err) throw err;
      }
    );

    file.id = newFileId;

    await renameFile(fileId, newFileId, file.data);
    const newFiles = await getSandboxFiles(data.sandboxId);

    callback(newFiles.files);
  });

  socket.on("createFile", async (name: string, callback) => {
    try {
      const size: number = await getProjectSize(data.sandboxId);
      // limit is 200mb
      if (size > 200 * 1024 * 1024) {
        io.emit(
          "rateLimit",
          "Rate limited: project size exceeded. Please delete some files."
        );
        callback({ success: false });
      }

      await createFileRL.consume(data.userId, 1);

      const id = `projects/${data.sandboxId}/${name}`;

      fs.writeFile(path.join(dirName, id), "", function (err) {
        if (err) throw err;
      });

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
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file creation. Please slow down.");
    }
  });

  socket.on("createFolder", async (name: string, callback) => {
    try {
      await createFolderRL.consume(data.userId, 1);

      const id = `projects/${data.sandboxId}/${name}`;

      fs.mkdir(path.join(dirName, id), { recursive: true }, function (err) {
        if (err) throw err;
      });

      callback();
    } catch (e) {
      io.emit("rateLimit", "Rate limited: folder creation. Please slow down.");
    }
  });

  socket.on("renameFile", async (fileId: string, newName: string) => {
    try {
      await renameFileRL.consume(data.userId, 1);

      const file = sandboxFiles.fileData.find((f) => f.id === fileId);
      if (!file) return;
      file.id = newName;

      const parts = fileId.split("/");
      const newFileId =
        parts.slice(0, parts.length - 1).join("/") + "/" + newName;

      fs.rename(
        path.join(dirName, fileId),
        path.join(dirName, newFileId),
        function (err) {
          if (err) throw err;
        }
      );
      await renameFile(fileId, newFileId, file.data);
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file renaming. Please slow down.");
      return;
    }
  });

  socket.on("deleteFile", async (fileId: string, callback) => {
    try {
      await deleteFileRL.consume(data.userId, 1);
      const file = sandboxFiles.fileData.find((f) => f.id === fileId);
      if (!file) return;

      fs.unlink(path.join(dirName, fileId), function (err) {
        if (err) throw err;
      });
      sandboxFiles.fileData = sandboxFiles.fileData.filter(
        (f) => f.id !== fileId
      );

      await deleteFile(fileId);

      const newFiles = await getSandboxFiles(data.sandboxId);
      callback(newFiles.files);
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file deletion. Please slow down.");
    }
  });

  // todo
  // socket.on("renameFolder", async (folderId: string, newName: string) => {
  // });

  socket.on("deleteFolder", async (folderId: string, callback) => {
    const files = await getFolder(folderId);

    await Promise.all(
      files.map(async (file) => {
        fs.unlink(path.join(dirName, file), function (err) {
          if (err) throw err;
        });

        sandboxFiles.fileData = sandboxFiles.fileData.filter(
          (f) => f.id !== file
        );

        await deleteFile(file);
      })
    );

    const newFiles = await getSandboxFiles(data.sandboxId);

    callback(newFiles.files);
  });

  socket.on("createTerminal", async (id: string, callback) => {
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
        await terminals[id].sendData("export PS1='user> '\rclear\r");
        console.log("Created terminal", id);
      } catch (error) {
        console.error("Error creating terminal ", id, error);
      }
    });

    callback();
  });

  socket.on("resizeTerminal", (dimensions: { cols: number; rows: number }) => {
    Object.values(terminals).forEach((t) => {
      t.resize(dimensions);
    });
  });

  socket.on("terminalData", (id: string, data: string) => {
    if (!terminals[id]) {
      return;
    }

    try {
      terminals[id].sendData(data);
    } catch (e) {
      console.log("Error writing to terminal", e);
    }
  });

  socket.on("closeTerminal", async (id: string, callback) => {
    if (!terminals[id]) {
      return;
    }

    await terminals[id].kill();
    delete terminals[id];

    callback();
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
    }
  );

  socket.on("disconnect", async () => {
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
  });
});

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
