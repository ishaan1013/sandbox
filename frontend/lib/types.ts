// DB Types

export type User = {
  id: string;
  name: string;
  email: string;
  generations: number;
  sandbox: Sandbox[];
  usersToSandboxes: UsersToSandboxes[];
};

export type Sandbox = {
  id: string;
  name: string;
  type: "react" | "node";
  visibility: "public" | "private";
  createdAt: Date;
  userId: string;
  usersToSandboxes: UsersToSandboxes[];
};

export type UsersToSandboxes = {
  userId: string;
  sandboxId: string;
  sharedOn: Date;
};

export type R2Files = {
  objects: R2FileData[];
  truncated: boolean;
  delimitedPrefixes: any[];
};

export type R2FileData = {
  storageClass: string;
  uploaded: string;
  checksums: any;
  httpEtag: string;
  etag: string;
  size: number;
  version: string;
  key: string;
};

export type TFolder = {
  id: string;
  type: "folder";
  name: string;
  children: (TFile | TFolder)[];
};

export type TFile = {
  id: string;
  type: "file";
  name: string;
};

export type TTab = TFile & {
  saved: boolean;
};

export type TFileData = {
  id: string;
  data: string;
};
