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
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFile = exports.renameFile = exports.createFile = exports.getSandboxFiles = void 0;
const getSandboxFiles = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const sandboxRes = yield fetch(`https://storage.ishaan1013.workers.dev/api?sandboxId=${id}`);
    const sandboxData = yield sandboxRes.json();
    const paths = sandboxData.objects.map((obj) => obj.key);
    const processedFiles = yield processFiles(paths, id);
    // console.log("processedFiles.fileData:", processedFiles.fileData)
    return processedFiles;
});
exports.getSandboxFiles = getSandboxFiles;
const processFiles = (paths, id) => __awaiter(void 0, void 0, void 0, function* () {
    const root = { id: "/", type: "folder", name: "/", children: [] };
    const fileData = [];
    paths.forEach((path) => {
        const allParts = path.split("/");
        if (allParts[1] !== id) {
            console.log("invalid path!!!!");
            return;
        }
        const parts = allParts.slice(2);
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1 && part.includes(".");
            const existing = current.children.find((child) => child.name === part);
            if (existing) {
                if (!isFile) {
                    current = existing;
                }
            }
            else {
                if (isFile) {
                    const file = { id: path, type: "file", name: part };
                    current.children.push(file);
                    fileData.push({ id: path, data: "" });
                }
                else {
                    const folder = {
                        id: path, // todo: wrong id. for example, folder "src" ID is: projects/a7vgttfqbgy403ratp7du3ln/src/App.css
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
    yield Promise.all(fileData.map((file) => __awaiter(void 0, void 0, void 0, function* () {
        const data = yield fetchFileContent(file.id);
        file.data = data;
    })));
    return {
        files: root.children,
        fileData,
    };
});
const fetchFileContent = (fileId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fileRes = yield fetch(`https://storage.ishaan1013.workers.dev/api?fileId=${fileId}`);
        return yield fileRes.text();
    }
    catch (error) {
        console.error("ERROR fetching file:", error);
        return "";
    }
});
const createFile = (fileId) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(`https://storage.ishaan1013.workers.dev/api`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
    });
    return res.ok;
});
exports.createFile = createFile;
const renameFile = (fileId, newFileId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(`https://storage.ishaan1013.workers.dev/api/rename`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, newFileId, data }),
    });
    return res.ok;
});
exports.renameFile = renameFile;
const saveFile = (fileId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(`https://storage.ishaan1013.workers.dev/api/save`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, data }),
    });
    return res.ok;
});
exports.saveFile = saveFile;
