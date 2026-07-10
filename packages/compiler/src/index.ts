export * from './assets.js'
export * from './compiler.js'
export * from './sourcemap.js'
export * from './file.js'
// `virtualModulePathRegex` reaches the root through BOTH of the next two lines — `importer` re-exports protocol's
// binding for the plugins that have always imported it from there. Same declaration, so the star exports agree rather
// than collide; give `importer` its own binding of that name and it vanishes from the root instead.
export * from './importer.js'
export * from './point.js'
export * from './protocol.js'
export * from './resolver.js'
export * from './utils.js'
export * from './walker.js'
