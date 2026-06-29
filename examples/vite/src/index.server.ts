// Server entry. The preload must finish first: it registers the point0 compiler plugins (and env
// consts), so everything app.server.ts imports goes through them. Any direct `bun src/<file>.ts`
// run that imports app code needs the same `await import('./preload.js')` first line.
await import('./preload.js')
await import('./app.server.js')

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  // Server HMR (Vite dev). Bun is fine without it
  const { engine } = await import('./engine.js')
  import.meta.hot.dispose(() => engine.dispose())
  import.meta.hot.accept()
}

// The imports above are dynamic on purpose (order matters); this marks the file as a module for TypeScript.
export {}
