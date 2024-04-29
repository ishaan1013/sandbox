"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pty = void 0;
const node_pty_1 = require("node-pty");
const os_1 = __importDefault(require("os"));
class Pty {
    constructor(socket, id, cwd) {
        this.socket = socket;
        this.id = id;
        this.ptyProcess = (0, node_pty_1.spawn)(os_1.default.platform() === "win32" ? "cmd.exe" : "bash", [], {
            name: "xterm",
            cols: 100,
            cwd: cwd,
        });
        this.ptyProcess.onData((data) => {
            console.log("onData", data);
            this.send(data);
        });
        // this.write("hello world")
    }
    write(data) {
        console.log("writing data", data);
        this.ptyProcess.write(data);
    }
    send(data) {
        this.socket.emit("terminalResponse", {
            data: Buffer.from(data, "utf-8"),
        });
    }
}
exports.Pty = Pty;
