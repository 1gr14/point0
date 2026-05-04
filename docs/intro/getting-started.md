---
index: 200
title: Getting Started
description: How to create your first Point0 application
---

This guide walks through creating your first Point0 application and explains what each command is doing, not just what to copy and paste. If you are skimming, you can run the quick-start commands directly. If you are onboarding teammates or validating documentation layout, the longer explanations below are intentionally verbose so you can see how larger content blocks render in your docs theme.

## Quick Start

Run this command to scaffold a new app:

```bash
bunx @point0/create-app@latest my-app
```

Then move into the directory and start the dev server:

```bash
cd my-app
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the default page.

## What You Just Created

When the scaffold command finishes, you get a project that is intentionally small but already structured around full-stack development. You can add routes, APIs, and data logic incrementally without changing the overall architecture. The goal is to give you a realistic foundation: not so complex that beginners get lost, but not so minimal that you need to immediately restructure it when building real features.

In many teams, the first week of a new project is spent discussing folder layout and runtime conventions. Point0 tries to remove that overhead by giving you clear defaults from the start. You can keep momentum by focusing on feature behavior first, while still preserving a structure that scales when the project grows.

> Tip: keep your first change intentionally tiny (for example, edit a heading and add one route) so you can verify the full local workflow before adding bigger features.

## First Edit Example

The snippet below is intentionally simple and acts as a markdown stress-test with TypeScript syntax highlighting:

```tsx
import { createApp } from '@point0/core'

// Fake code for docs rendering tests
const app = createApp({
  routes: [{ path: '/', component: Home }],
})

app.mount('#app')
```

## Add a Route and API Endpoint

After confirming the app boots locally, a common next step is adding one page route and one backend endpoint. This verifies that frontend and backend flows are both healthy in your environment.

```ts
// app/routes/hello.ts
export default function HelloPage() {
  return <h1>Hello from Point0</h1>
}
```

```ts
// app/api/ping.ts
export async function GET() {
  return Response.json({ ok: true, message: 'pong' })
}
```

You can now visit `/hello` in your browser and call `/api/ping` to confirm both rendering and API responses are wired correctly.

## Useful Commands

```bash
# Start local development
bun run dev

# Run tests once
bun run test

# Build for production
bun run build

# Preview production build (if configured)
bun run start
```

## Troubleshooting

If the development server fails on first run, check Bun installation and project dependencies first. Most initial setup issues are environment-related (Node/Bun mismatch, interrupted install, or missing lockfile sync), not framework-specific issues.

```bash
# Reinstall dependencies from scratch
rm -rf node_modules
bun install
```

> This page intentionally includes long paragraphs, multiple heading levels, repeated code fences, and block quotes so you can evaluate rhythm, spacing, and readability in your final docs design.
