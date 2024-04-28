# Sandbox: Frontend

This is a Next.js 14 project using Typescript, Shadcn UI, Clerk, Socket.IO, and the Monaco Editor.

## Setup

Create a [Clerk](https://clerk.dev/) account and project to get your public + private key.

Then, set up your `.env` file with the required environment variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<YOUR_KEY>
CLERK_SECRET_KEY=<YOUR_KEY>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Running Locally

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Deploy on Vercel or any platform of your choice.
