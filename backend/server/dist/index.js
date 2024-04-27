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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const zod_1 = require("zod");
const getSandboxFiles_1 = __importDefault(require("./getSandboxFiles"));
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
const handshakeSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    sandboxId: zod_1.z.string(),
    EIO: zod_1.z.string(),
    transport: zod_1.z.string(),
});
io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    const q = socket.handshake.query;
    console.log("middleware");
    const parseQuery = handshakeSchema.safeParse(q);
    if (!parseQuery.success) {
        console.log("Invalid request.");
        next(new Error("Invalid request."));
        return;
    }
    const { sandboxId, userId } = parseQuery.data;
    const dbUser = yield fetch(`http://localhost:8787/api/user?id=${userId}`);
    const dbUserJSON = (yield dbUser.json());
    console.log("dbUserJSON:", dbUserJSON);
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
    const sandboxFiles = yield (0, getSandboxFiles_1.default)(data.id);
    socket.emit("loaded", sandboxFiles.files);
}));
httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
