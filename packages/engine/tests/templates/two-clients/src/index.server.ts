// Server entry. The preload must finish first: it registers the point0 compiler plugins (and env
// consts), so everything app.server.ts imports goes through them.
await import('./preload.js')
await import('./app.server.js')

if (import.meta.hot) {
  // Server HMR (Vite dev). Bun is fine without it
  const { engine } = await import('./engine.js')
  import.meta.hot.dispose(() => engine.dispose())
  import.meta.hot.accept()
}

// Only dynamic imports above (the order matters); this marks the file as a module for TypeScript.
export {}
