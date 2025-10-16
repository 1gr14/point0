# IdeaNick - Elysia + Vite + Bun Example

A complete example of using `@devp0nt/page0` with Elysia server, Vite client build, and Bun runtime.

## Features

- **Server-Side Rendering (SSR)** with Elysia
- **Client-Side Hydration** with React
- **Type-Safe Routing** with `@devp0nt/route0`
- **Fake Database** with Prisma-like API
- **Three Pages**: Home, Ideas List, Individual Idea
- **Comprehensive Tests** for both server and client

## Project Structure

```
examples/elysia-vite/
├── client/           # Client-side code
│   ├── index.tsx     # Hydration entry point
│   ├── pages.ts      # Page definitions
│   └── pages.test.tsx # Client tests
├── server/           # Server-side code
│   ├── index.ts      # Elysia server
│   ├── page.ts       # ServerPage0 setup
│   └── index.test.ts # Server tests
├── shared/           # Shared code
│   ├── data.ts       # Fake ideas data
│   ├── prisma.ts     # Fake Prisma client
│   └── routes.ts     # Route definitions
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript config
├── vite.config.ts    # Vite build config
└── README.md         # This file
```

## Getting Started

1. **Install dependencies:**

   ```bash
   cd examples/elysia-vite
   bun install
   ```

2. **Build the client:**

   ```bash
   bun run build
   ```

3. **Run the server:**

   ```bash
   bun run dev:server
   ```

4. **Open your browser:**
   Visit http://localhost:3000

## Development

- **Run both client and server in watch mode:**

  ```bash
  bun run dev
  ```

- **Run tests:**

  ```bash
  bun test
  ```

- **Run tests in watch mode:**
  ```bash
  bun run test:watch
  ```

## Pages

- **Home** (`/`) - Welcome page with navigation
- **Ideas List** (`/ideas`) - Shows all ideas with titles and descriptions
- **Idea Detail** (`/ideas/:id`) - Shows full idea content

## How It Works

1. **Server**: Elysia handles all routes and uses `ServerPage0.renderStatic()` to generate HTML
2. **Client**: Vite builds the client bundle, which hydrates the server-rendered HTML
3. **Data Flow**: Server loaders fetch data, client loaders can extend or override it
4. **Routing**: `@devp0nt/route0` provides type-safe route matching

## Testing

The example includes comprehensive tests:

- **Server Tests**: Verify SSR output, payload embedding, and error handling
- **Client Tests**: Test page configuration, route matching, and component setup

Run `bun test` to execute all tests.
