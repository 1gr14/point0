---
index: 100
title: Overview
description: Overview of Point0
---

Point0 is a framework for building web applications, but more importantly it is a framework for building _maintainable_ applications that can survive real product pressure. It aims to keep routing, rendering, data loading, and backend concerns in one coherent model so teams can iterate quickly without rewriting the architecture every few months. If you have ever had a project where frontend and backend drifted apart and every feature started feeling like a small migration, Point0 is designed to prevent that experience from becoming the default.

The core idea is simple: use one opinionated foundation, keep your primitives explicit, and make the happy path fast enough that people avoid ad-hoc workarounds. Over time this pays off in the places that matter most, like onboarding new developers, debugging production issues, and shipping features that touch multiple layers of the stack. You can start small with only a couple of routes and a tiny API, then scale the same project into a larger system without introducing a second framework just to fill gaps.

Or right now you can [createa new Point0 project](./getting-started) and start building your application.

## Features

- SSR
- CSR
- API
- Database
- Authentication
- Authorization

### Full-Stack by Default

Point0 keeps server and client concerns close enough to move quickly, while still separating responsibilities in code. You can render pages on the server for fast first paint, hydrate on the client for rich interactivity, and expose API endpoints in the same project structure. This is especially useful when you need to coordinate UI behavior with backend validation, access control, and data persistence without bouncing between unrelated tools.

### Predictable Conventions

Conventions in Point0 are intentionally boring in the best way: a route behaves like a route, an endpoint behaves like an endpoint, and project layout stays readable as the codebase grows. Teams can choose where to be creative in product behavior and user experience, while the framework handles repetitive plumbing consistently. That makes code reviews easier and lowers the chance of accidental architecture drift.

## Why Point0?

Most teams do not struggle because they cannot write code; they struggle because every new feature forces them to reason about too many unrelated decisions at once. Which router owns this page? Which runtime executes this logic? Which validation library is considered canonical today? Which part of the code can safely access the database? Point0 reduces that decision surface by giving you one cohesive system with clear boundaries, so you can spend your energy on product outcomes instead of framework negotiations.

> "Good defaults are not about limiting teams. They are about removing low-value decisions so teams can focus on high-value ones."

In practical terms, that means faster onboarding, fewer one-off patterns, and less tooling friction between local development and production. You can still customize behavior when needed, but you start from a path that is production-oriented from day one.

```ts
// Simplified pseudo-example to show the "single mental model" approach.
import { defineRoute, defineApi } from '@point0/core'

export const dashboardRoute = defineRoute({
  path: '/dashboard',
  loader: async ({ db, user }) => {
    if (!user) return { redirect: '/login' }
    const projects = await db.project.findMany({ where: { ownerId: user.id } })
    return { projects }
  },
})

export const createProjectApi = defineApi({
  method: 'POST',
  path: '/api/projects',
  handler: async ({ db, body, user }) => {
    if (!user) return { status: 401, body: { error: 'Unauthorized' } }
    const project = await db.project.create({ data: { ...body, ownerId: user.id } })
    return { status: 201, body: project }
  },
})
```

## How to get started?

1. Install Point0
2. Create a new Point0 project
3. Start the development server
4. Build the application
5. Deploy the application

### A Typical Team Flow

1. One developer scaffolds a new project and lands the first route.
2. Another developer adds auth and a protected API endpoint.
3. A third developer wires in data models and query logic.
4. Everyone shares the same runtime assumptions and command set.
5. The team ships an initial feature slice without stitching together multiple framework ecosystems.

```bash
# Example lifecycle commands you might run during early development
bunx @point0/create-app@latest acme-portal
cd acme-portal
bun install
bun run dev
bun run test
bun run build
```

> If you are evaluating docs styles, this page intentionally includes dense paragraphs, lists, code fences, and block quotes so you can preview spacing, typography, and readability under heavier content.
