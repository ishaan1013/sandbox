import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

import fs from "fs";
import yaml from "yaml";
import path from "path";
import cors from "cors";
import {
  KubeConfig,
  AppsV1Api,
  CoreV1Api,
  NetworkingV1Api,
} from "@kubernetes/client-node";
import { z } from "zod";

const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
dotenv.config();

// const corsOptions = {
//   origin: ['http://localhost:3000', 'https://s.ishaand.com', 'http://localhost:4000', /\.ws\.ishaand\.com$/],
// }
// app.use(cors(corsOptions))

app.use(cors());

const kubeconfig = new KubeConfig();

console.log("GKE_CLUSTER_SERVER", process.env.GKE_CLUSTER_SERVER);
console.log(
  "GKE_CLUSTER_CA_DATA",
  process.env.GKE_CLUSTER_CA_DATA?.slice(0, 36)
);

kubeconfig.loadFromOptions({
  clusters: [
    {
      name: "gke_sylvan-epoch-422219-f9_us-central1_sandbox-cluster",
      server: process.env.GKE_CLUSTER_SERVER!,
      caData: process.env.GKE_CLUSTER_CA_DATA,
    },
  ],
  users: [
    {
      name: "gke_sylvan-epoch-422219-f9_us-central1_sandbox-cluster",
      exec: {
        apiVersion: "client.authentication.k8s.io/v1beta1",
        command: "gke-gcloud-auth-plugin",
        installHint:
          "Install gke-gcloud-auth-plugin for use with kubectl by following https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl#install_plugin",
        interactiveMode: "IfAvailable",
        provideClusterInfo: true,
      },
    },
  ],
  contexts: [
    {
      name: "gke_sylvan-epoch-422219-f9_us-central1_sandbox-cluster",
      cluster: "gke_sylvan-epoch-422219-f9_us-central1_sandbox-cluster",
      user: "gke_sylvan-epoch-422219-f9_us-central1_sandbox-cluster",
    },
  ],
  currentContext: "gke_sylvan-epoch-422219-f9_us-central1_sandbox-cluster",
});

const appsV1Api = kubeconfig.makeApiClient(AppsV1Api);
const coreV1Api = kubeconfig.makeApiClient(CoreV1Api);
const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api);

const readAndParseKubeYaml = (
  filePath: string,
  sandboxId: string
): Array<any> => {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const docs = yaml.parseAllDocuments(fileContent).map((doc) => {
    let docString = doc.toString();

    const regex = new RegExp(`<SANDBOX>`, "g");
    docString = docString.replace(regex, sandboxId);

    if (!process.env.CF_API_TOKEN) {
      throw new Error("CF_API_TOKEN is not defined");
    }
    const regexEnv1 = new RegExp(`<CF_API_TOKEN>`, "g");
    docString = docString.replace(regexEnv1, process.env.CF_API_TOKEN);

    if (!process.env.CF_USER_ID) {
      throw new Error("CF_USER_ID is not defined");
    }
    const regexEnv2 = new RegExp(`<CF_USER_ID>`, "g");
    docString = docString.replace(regexEnv2, process.env.CF_USER_ID);

    return yaml.parse(docString);
  });
  return docs;
};

const dataSchema = z.object({
  userId: z.string(),
  sandboxId: z.string(),
});

const namespace = "ingress-nginx";

app.post("/test", async (req, res) => {
  const pods = await coreV1Api.listNamespacedPod(namespace);
  res.status(200).send({
    pods: pods.body.items.map((item) => item?.metadata?.generateName),
    message: "Orchestrator is up and running.",
  });
  // res.status(200).send({ message: "Orchestrator is up and running." })
});

app.post("/start", async (req, res) => {
  const { sandboxId } = dataSchema.parse(req.body);

  try {
    console.log("Creating resources for sandbox", sandboxId);

    const kubeManifests = readAndParseKubeYaml(
      path.join(__dirname, "../service.yaml"),
      sandboxId
    );

    async function resourceExists(api: any, getMethod: string, name: string) {
      try {
        await api[getMethod](name, namespace);
        return true;
      } catch (e: any) {
        if (e.response && e.response.statusCode === 404) {
          console.log(
            "Resource does not exist.",
            e.response.body.message,
            e.response.body.details
          );
          return false;
        }
        throw e;
      }
    }

    const createResource = async (api: any, method: string, manifest: any) => {
      const {
        kind,
        metadata: { name },
      } = manifest;
      if (!(await resourceExists(api, "readNamespaced" + kind, name))) {
        await api["createNamespaced" + kind](namespace, manifest);
        console.log(`Created ${kind.toLowerCase()}`, name);
      } else {
        console.log(`${kind} ${name} already exists.`);
      }
    };

    const promises = kubeManifests.map(async (manifest) => {
      const {
        kind,
        metadata: { name },
      } = manifest;

      console.log("Kind:", kind);

      switch (manifest.kind) {
        case "Deployment":
          return createResource(appsV1Api, "Deployment", manifest);
        case "Service":
          return createResource(coreV1Api, "Service", manifest);
        case "Ingress":
          return createResource(networkingV1Api, "Ingress", manifest);
        default:
          console.error("Unsupported kind:", manifest.kind);
          return Promise.reject("Unsupported kind: " + manifest.kind);
      }
    });

    await Promise.all(promises);

    console.log("All done!");
    res.status(200).send({ message: "Resources created." });
  } catch (error: any) {
    const body = error.response.body;
    console.log("Failed to create resources", error);

    if (body.code === 409) {
      return res.status(200).send({ message: "Resource already exists." });
    }
    res.status(500).send({ message: "Failed to create resources." });
  }
});

app.post("/stop", async (req, res) => {
  const { sandboxId } = dataSchema.parse(req.body);
  console.log("Deleting resources for sandbox", sandboxId);

  try {
    const kubeManifests = readAndParseKubeYaml(
      path.join(__dirname, "../service.yaml"),
      sandboxId
    );
    const promises = kubeManifests.map(async (manifest) => {
      if (manifest.kind === "Deployment")
        await appsV1Api.deleteNamespacedDeployment(
          manifest.metadata?.name || "",
          namespace
        );
      else if (manifest.kind === "Service")
        await coreV1Api.deleteNamespacedService(
          manifest.metadata?.name || "",
          namespace
        );
      else if (manifest.kind === "Ingress")
        await networkingV1Api.deleteNamespacedIngress(
          manifest.metadata?.name || "",
          namespace
        );
    });

    await Promise.all(promises);

    res.status(200).send({ message: "Resources deleted." });
  } catch (error) {
    console.log("Failed to delete resources", error);
    res.status(500).send({ message: "Failed to delete resources." });
  }
});

app.listen(port, () => {
  console.log(`Listening on port: ${port}`);
});
