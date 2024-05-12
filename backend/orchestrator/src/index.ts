import express, { Express, Request, Response } from "express"
import dotenv from "dotenv"

import fs from "fs"
import yaml from "yaml"
import path from "path"
import cors from "cors"
import {
  KubeConfig,
  AppsV1Api,
  CoreV1Api,
  NetworkingV1Api,
} from "@kubernetes/client-node"
import { z } from "zod"

const app = express()
const port = process.env.PORT || 4001
app.use(express.json())
dotenv.config()

const corsOptions = {
  origin: ['http://localhost:3000', 'https://s.ishaand.com', 'http://localhost:4000'],
}

const kubeconfig = new KubeConfig()
if (process.env.NODE_ENV === "production") {
  kubeconfig.loadFromOptions({
    clusters: [
      {
        name: 'docker-desktop',
        server: process.env.DOCKER_DESKTOP_SERVER!,
        caData: process.env.DOCKER_DESKTOP_CA_DATA,
      },
      {
        name: 'gke_sylvan-epoch-422219-f9_us-central1_sandbox',
        server: process.env.GKE_CLUSTER_SERVER!,
        caData: process.env.GKE_CLUSTER_CA_DATA, 
      }
    ],
    users: [
      {
        name: 'docker-desktop',
        certData: process.env.DOCKER_DESKTOP_CLIENT_CERTIFICATE_DATA,
        keyData: process.env.DOCKER_DESKTOP_CLIENT_KEY_DATA,
      },
      {
        name: 'gke_sylvan-epoch-422219-f9_us-central1_sandbox',
        exec: {
          apiVersion: 'client.authentication.k8s.io/v1beta1',
          command: 'gke-gcloud-auth-plugin',
          args: [],
          env: null,
          installHint: 'Install gke-gcloud-auth-plugin for use with kubectl by following https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl#install_plugin',
          interactiveMode: 'IfAvailable',
          provideClusterInfo: true
        }
      }
    ],
    contexts: [
      {
        name: 'docker-desktop',
        cluster: 'docker-desktop',
        user: 'docker-desktop'
      },
      {
        name: 'gke_sylvan-epoch-422219-f9_us-central1_sandbox',
        cluster: 'gke_sylvan-epoch-422219-f9_us-central1_sandbox',
        user: 'gke_sylvan-epoch-422219-f9_us-central1_sandbox'
      }
    ],
    currentContext: "gke_sylvan-epoch-422219-f9_us-central1_sandbox",
  });
}
kubeconfig.loadFromDefault()

const coreV1Api = kubeconfig.makeApiClient(CoreV1Api)
const appsV1Api = kubeconfig.makeApiClient(AppsV1Api)
const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api)

const readAndParseKubeYaml = (
  filePath: string,
  sandboxId: string
): Array<any> => {
  const fileContent = fs.readFileSync(filePath, "utf8")
  const docs = yaml.parseAllDocuments(fileContent).map((doc) => {
    let docString = doc.toString()

    const regex = new RegExp(`<SANDBOX>`, "g")
    docString = docString.replace(regex, sandboxId)

    if (!process.env.CF_API_TOKEN) {
      throw new Error("CF_API_TOKEN is not defined")
    }
    const regexEnv1 = new RegExp(`<CF_API_TOKEN>`, "g")
    docString = docString.replace(regexEnv1, process.env.CF_API_TOKEN)

    if (!process.env.CF_USER_ID) {
      throw new Error("CF_USER_ID is not defined")
    }
    const regexEnv2 = new RegExp(`<CF_USER_ID>`, "g")
    docString = docString.replace(regexEnv2, process.env.CF_USER_ID)

    return yaml.parse(docString)
  })
  return docs
}

const dataSchema = z.object({
  userId: z.string(),
  sandboxId: z.string(),
})

const namespace = "sandbox"

app.get("/test", cors(), async (req, res) => {
  res.status(200).send({ message: "Orchestrator is up and running." })
})

app.get("/test/cors", cors(corsOptions), async (req, res) => {
  res.status(200).send({ message: "With CORS, Orchestrator is up and running." })
})

app.post("/start", cors(corsOptions), async (req, res) => {
  const { sandboxId } = dataSchema.parse(req.body)

  try {
    const kubeManifests = readAndParseKubeYaml(
      path.join(__dirname, "../service.yaml"),
      sandboxId
    )

    async function resourceExists(api: any, getMethod: string, name: string) {
      try {
        await api[getMethod](namespace, name)
        return true
      } catch (e: any) {
        if (e.response && e.response.statusCode === 404) return false
        throw e
      }
    }

    kubeManifests.forEach(async (manifest) => {
      const { kind, metadata: { name } } = manifest

      if (kind === "Deployment")
        if (!(await resourceExists(appsV1Api, 'readNamespacedDeployment', name))) {
          await appsV1Api.createNamespacedDeployment(namespace, manifest)
        } else {
          return res.status(200).send({ message: "Resource deployment already exists." })
        }
      else if (kind === "Service")
        if (!(await resourceExists(coreV1Api, 'readNamespacedService', name))) {
          await coreV1Api.createNamespacedService(namespace, manifest)
        } else {
          return res.status(200).send({ message: "Resource service already exists." })
        }
      else if (kind === "Ingress")
        if (!(await resourceExists(networkingV1Api, 'readNamespacedIngress', name))) {
          await networkingV1Api.createNamespacedIngress(namespace, manifest)
        } else {
          return res.status(200).send({ message: "Resource ingress already exists." })
        }
    })
    res.status(200).send({ message: "Resources created." })
  } catch (error) {
    console.log("Failed to create resources", error)
    res.status(500).send({ message: "Failed to create resources." })
  }
})

app.post("/stop", cors(corsOptions), async (req, res) => {
  const { sandboxId } = dataSchema.parse(req.body)

  try {
    const kubeManifests = readAndParseKubeYaml(
      path.join(__dirname, "../service.yaml"),
      sandboxId
    )
    kubeManifests.forEach(async (manifest) => {
      if (manifest.kind === "Deployment")
        await appsV1Api.deleteNamespacedDeployment(
          manifest.metadata?.name || "",
          namespace
        )
      else if (manifest.kind === "Service")
        await coreV1Api.deleteNamespacedService(
          manifest.metadata?.name || "",
          namespace
        )
      else if (manifest.kind === "Ingress")
        await networkingV1Api.deleteNamespacedIngress(
          manifest.metadata?.name || "",
          namespace
        )
    })
    res.status(200).send({ message: "Resources deleted." })
  } catch (error) {
    console.log("Failed to delete resources", error)
    res.status(500).send({ message: "Failed to delete resources." })
  }
})

app.listen(port, () => {
  console.log(`Listening on port: ${port}`)
})
