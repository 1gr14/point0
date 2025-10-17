# IdeaNick - Elysia + Vite + Bun Example

A complete example of using `@devp0nt/page0` with Elysia server, Vite SSR, and Bun runtime featuring automatic code splitting and unified development workflow.

## Features

- **Server-Side Rendering (SSR)** with Elysia and Vite
- **Client-Side Hydration** with React
- **Type-Safe Routing** with `@devp0nt/route0`
- **Fake Database** with Prisma-like API
- **Three Pages**: Home, Ideas List, Individual Idea
- **Code Splitting** - Each page in separate bundle
- **Unified Dev Server** - Single process for frontend and backend
- **Comprehensive Tests** for both server and client

## Project Structure

```
examples/elysia-vite/
├── pages/            # Page components (code-split)
│   ├── home.tsx      # Home page
│   ├── ideas.tsx     # Ideas list page
│   ├── idea.tsx      # Individual idea page
│   ├── index.ts      # ClientPages array with dynamic imports
│   └── pages.test.tsx # Client tests
├── server/           # Server-side code
│   ├── index.ts      # Elysia server with Vite middleware
│   ├── page0.ts      # ServerPage0 setup
│   └── index.test.ts # Server tests
├── shared/           # Shared code
│   ├── data.ts       # Fake ideas data
│   ├── prisma.ts     # Fake Prisma client
│   └── routes.ts     # Route definitions
├── entry-client.tsx  # Client-side hydration entry
├── entry-server.tsx  # Server-side rendering entry
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript config
├── vite.config.ts    # Vite SSR config
└── README.md         # This file
```

## Getting Started

1. **Install dependencies:**

   ```bash
   cd examples/elysia-vite
   bun install
   ```

2. **Build for production:**

   ```bash
   bun run build
   ```

3. **Run development server:**

   ```bash
   bun run dev
   ```

4. **Open your browser:**
   Visit http://localhost:3000

## Development

- **Run development server with HMR:**

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

- **Run production server:**
  ```bash
  bun run start
  ```

## Pages

- **Home** (`/`) - Welcome page with navigation
- **Ideas List** (`/ideas`) - Shows all ideas with titles and descriptions
- **Idea Detail** (`/ideas/:id`) - Shows full idea content

## How It Works

1. **Unified Dev Server**: Single process runs Elysia server with Vite dev middleware
2. **SSR**: Vite's `ssrLoadModule` loads entry-server.tsx in development, pre-built bundles in production
3. **Code Splitting**: Each page is in a separate file, enabling automatic code splitting
4. **Client Hydration**: Vite builds client bundle with entry-client.tsx for hydration
5. **Data Flow**: Server loaders fetch data, client loaders can extend or override it
6. **Routing**: `@devp0nt/route0` provides type-safe route matching with dynamic imports

## Testing

The example includes comprehensive tests:

- **Server Tests**: Verify SSR output, payload embedding, and error handling
- **Client Tests**: Test page configuration, route matching, and component setup

Run `bun test` to execute all tests.
