// # index:
// #   path: src/index.html
// #   generate: true # only if not exists
// # points:
// #   path: node_modules/@point0/points.ts
// #   generate: true
// #   glob: ['src/pages/**/*.tsx', '!src/pages/**/*.view.tsx']
// #   exportDefault: true
// #   exportNameMatch: 'Page$'
// # public:
// #   path: public
// #   enabled: true
// # client:
// #   entry: node_modules/@point0/index.client.ts
// #   consumerModulePath: src/client.ts
// #   consumerExportName: client
// #   dist: dist/client
// #   generate: true
// # server:
// #   entry: node_modules/@point0/index.server.ts
// #   dist: dist/server
// #   generate: true
// #   port: 'env.PORT' # true for auto port, string for manual port, number for port, false for no port so u can serve via somethig else manually
// #   providerModulePath: src/server.ts
// #   providerExportName: server
