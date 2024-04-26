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
const getSandboxFiles = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const sandboxRes = yield fetch(`https://storage.ishaan1013.workers.dev/api?sandboxId=${id}`);
    const sandboxData = yield sandboxRes.json();
    const paths = sandboxData.objects.map((obj) => obj.key);
    return processFiles(paths, id);
});
const processFiles = (paths, id) => {
    const root = { id: "/", type: "folder", name: "/", children: [] };
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
                }
                else {
                    const folder = {
                        id: path,
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
    return root.children;
};
exports.default = getSandboxFiles;
