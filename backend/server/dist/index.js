"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const zod_1 = require("zod");
const utils_1 = require("./utils");
const terminal_1 = require("./terminal");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
// app.use(cors())
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
    },
});
const terminals = {};
const dirName = path_1.default.join(__dirname, "..");
const handshakeSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    sandboxId: zod_1.z.string(),
    EIO: zod_1.z.string(),
    transport: zod_1.z.string(),
});
io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    const q = socket.handshake.query;
    const parseQuery = handshakeSchema.safeParse(q);
    if (!parseQuery.success) {
        console.log("Invalid request.");
        next(new Error("Invalid request."));
        return;
    }
    const { sandboxId, userId } = parseQuery.data;
    const dbUser = yield fetch(`http://localhost:8787/api/user?id=${userId}`);
    const dbUserJSON = (yield dbUser.json());
    if (!dbUserJSON) {
        console.log("DB error.");
        next(new Error("DB error."));
        return;
    }
    const sandbox = dbUserJSON.sandbox.find((s) => s.id === sandboxId);
    if (!sandbox) {
        console.log("Invalid credentials.");
        next(new Error("Invalid credentials."));
        return;
    }
    socket.data = {
        id: sandboxId,
        userId,
    };
    next();
}));
io.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
    const data = socket.data;
    const sandboxFiles = yield (0, utils_1.getSandboxFiles)(data.id);
    sandboxFiles.fileData.forEach((file) => {
        const filePath = path_1.default.join(dirName, file.id);
        fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
        fs_1.default.writeFile(filePath, file.data, function (err) {
            if (err)
                throw err;
            // console.log("Saved File:", file.id)
        });
    });
    socket.emit("loaded", sandboxFiles.files);
    socket.on("getFile", (fileId, callback) => {
        const file = sandboxFiles.fileData.find((f) => f.id === fileId);
        if (!file)
            return;
        // console.log("get file " + file.id + ": ", file.data.slice(0, 10) + "...")
        callback(file.data);
    });
    // todo: send diffs + debounce for efficiency
    socket.on("saveFile", (fileId, body) => __awaiter(void 0, void 0, void 0, function* () {
        const file = sandboxFiles.fileData.find((f) => f.id === fileId);
        if (!file)
            return;
        file.data = body;
        // console.log("save file " + file.id + ": ", file.data)
        fs_1.default.writeFile(path_1.default.join(dirName, file.id), body, function (err) {
            if (err)
                throw err;
        });
        yield (0, utils_1.saveFile)(fileId, body);
    }));
    socket.on("createFile", (name) => __awaiter(void 0, void 0, void 0, function* () {
        const id = `projects/${data.id}/${name}`;
        console.log("create file", id, name);
        fs_1.default.writeFile(path_1.default.join(dirName, id), "", function (err) {
            if (err)
                throw err;
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
        yield (0, utils_1.createFile)(id);
    }));
    socket.on("renameFile", (fileId, newName) => __awaiter(void 0, void 0, void 0, function* () {
        const file = sandboxFiles.fileData.find((f) => f.id === fileId);
        if (!file)
            return;
        file.id = newName;
        const parts = fileId.split("/");
        const newFileId = parts.slice(0, parts.length - 1).join("/") + "/" + newName;
        fs_1.default.rename(path_1.default.join(dirName, fileId), path_1.default.join(dirName, newFileId), function (err) {
            if (err)
                throw err;
        });
        yield (0, utils_1.renameFile)(fileId, newFileId, file.data);
    }));
    socket.on("createTerminal", ({ id }) => {
        console.log("creating terminal (" + id + ")");
        terminals[id] = new terminal_1.Pty(socket, id, `/projects/${data.id}`);
    });
    socket.on("terminalData", ({ id, data }) => {
        console.log(`Received data for terminal ${id}: ${data}`);
        if (!terminals[id]) {
            console.log("terminal not found");
            console.log("terminals", terminals);
            return;
        }
        console.log(`Writing to terminal ${id}`);
        terminals[id].write(data);
    });
    socket.on("disconnect", () => { });
}));
httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
