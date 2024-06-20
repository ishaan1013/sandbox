# Sandbox 📦🪄

<img width="1799" alt="Screenshot 2024-05-31 at 8 33 56 AM" src="https://github.com/ishaan1013/sandbox/assets/69771365/3f73d7c0-f82a-4997-b01e-eaa043e95113">

Sandbox is an open-source cloud-based code editing environment with custom AI code autocompletion and real-time collaboration.

Check out the [Twitter thread](https://x.com/ishaandey_/status/1796338262002573526) with the demo video!

Check out this [guide](https://dev.to/jamesmurdza/how-to-setup-ishaan1013sandbox-locally-503p) made by [@jamesmurdza](https://x.com/jamesmurdza) on setting it up locally!

## Running Locally

### Frontend

Install dependencies

```bash
cd frontend
npm install
```

Add the required environment variables in `.env` (example file provided in `.env.example`). You will need to make an account on [Clerk](https://clerk.com/) and [Liveblocks](https://liveblocks.io/) to get API keys.

Then, run in development mode

```bash
npm run dev
```

### Backend

The backend consists of a primary Express and Socket.io server, and 3 Cloudflare Workers microservices for the D1 database, R2 storage, and Workers AI. The D1 database also contains a [service binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/) to the R2 storage worker. Each open sandbox instantiates a secure Linux sandboxes on E2B, which is used for the terminal and live preview.

You will need to make an account on [E2B](https://e2b.dev/) to get an API key.

#### Socket.io server

Install dependencies

```bash
cd backend/server
npm install
```

Add the required environment variables in `.env` (example file provided in `.env.example`)

Project files will be stored in the `projects/<project-id>` directory. The middleware contains basic authorization logic for connecting to the server.

Run in development mode

```bash
npm run dev
```

This directory is dockerized, so feel free to deploy a container on any platform of your choice! I chose not to deploy this project for public access due to costs & safety, but deploying your own for personal use should be no problem.

#### Cloudflare Workers (Database, Storage, AI)

Directories:

- `/backend/database`: D1 database
- `/backend/storage`: R2 storage
- `/backend/ai`: Workers AI

Install dependencies

```bash
cd backend/database
npm install

cd ../storage
npm install

cd ../ai
npm install
```

Read the [documentation](https://developers.cloudflare.com/workers/) to learn more about workers.

For each directory, add the required environment variables in `wrangler.toml` (example file provided in `wrangler.example.toml`). For the AI worker, you can define any value you want for the `CF_AI_KEY` -- set this in other `.env` files to authorize access.

Run in development mode

```bash
npm run dev
```

Deploy to Cloudflare with [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

```bash
npx wrangler deploy
```

---

## Contributing

Thanks for your interest in contributing! Review this section before submitting your first pull request. If you need any help, feel free to reach out to [@ishaandey\_](https://x.com/ishaandey_).

Please prioritize existing issues, but feel free to contribute new issues if you have ideas for a feature or bug that you think would be useful.

### Structure

```
frontend/
├── app
├── assets
├── components
└── lib
backend/
├── server
├── database/
│   ├── src
│   └── drizzle
├── storage
└── ai
```

| Path               | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| `frontend`         | The Next.js application for the frontend.                                  |
| `backend/server`   | The Express websocket server.                                              |
| `backend/database` | API for interfacing with the D1 database (SQLite).                         |
| `backend/storage`  | API for interfacing with R2 storage. Service-bound to `/backend/database`. |
| `backend/ai`       | API for making requests to Workers AI .                                    |

### Development

#### Fork this repo

You can fork this repo by clicking the fork button in the top right corner of this page.

#### Clone repository

```bash
git clone https://github.com/<your-username>/sandbox.git
cd sandbox
```

#### Create a new branch

```bash
git checkout -b my-new-branch
```

### Commit convention

Before you create a Pull Request, please check that you use the [Conventional Commits format](https://www.conventionalcommits.org/en/v1.0.0/)

It should be in the form `category(scope or module): message` in your commit message from the following categories:

- `feat / feature`: all changes that introduce completely new code or new
  features
- `fix`: changes that fix a bug (ideally you will additionally reference an
  issue if present)
- `refactor`: any code related change that is not a fix nor a feature
- `docs`: changing existing or creating new documentation (i.e. README, docs for
  usage of a lib or cli usage)
- `chore`: all changes to the repository that do not fit into any of the above
  categories

  e.g. `feat(editor): improve tab switching speed`

---

## Tech stack

### Frontend

- [Next.js](https://nextjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Clerk](https://clerk.com/)
- [Monaco](https://microsoft.github.io/monaco-editor/)
- [Liveblocks](https://liveblocks.io/)

### Backend

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
  - [D1 database](https://developers.cloudflare.com/d1/)
  - [R2 storage](https://developers.cloudflare.com/r2/)
  - [Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [E2B](https://e2b.dev/)
