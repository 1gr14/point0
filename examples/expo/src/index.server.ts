// Server entry. The preload must finish first: it registers the point0 compiler plugins (and env
// consts), so everything app.server.ts imports goes through them. Any direct `bun src/<file>.ts`
// run that imports app code needs the same `await import('./preload.js')` first line.
await import('./preload.js')

// The env handle is lazy, so nothing is checked until it's read. Validate the whole server shape here — after the
// preload has loaded `.env`, before any app code — so a misconfigured server fails at startup.
const { serverEnv } = await import('./lib/env/server.js')
serverEnv.validate()

await import('./app.server.js')

// Only dynamic imports above (the order matters); this marks the file as a module for TypeScript.
export {}
