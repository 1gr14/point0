// Server entry. The preload must finish first: it registers the point0 compiler plugins (and env
// consts), so everything app.server.ts imports goes through them.
await import('./preload.js')
await import('./app.server.js')

// Only dynamic imports above (the order matters); this marks the file as a module for TypeScript.
export {}
