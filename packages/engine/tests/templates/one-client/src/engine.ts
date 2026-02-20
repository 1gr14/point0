import { Engine } from '@point0/engine'
export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx}'],
  serveRetries: 99,
  server: {
    scope: 'root',
    entry: { main: './index.server.ts' },
    points: async () => await import('./lib/points.server'),
    generate: [
      {
        what: 'points',
        outfile: './lib/points.server.ts',
      },
    ],
    outdir: '../dist/server',
    env: { vars: { MY_ENV_SERVER_VARIABLE: 'SERVER1' }, consts: ['MY_ENV_FILE_CONSTANT'] },
    // port: server,
    // hmrPort: server,
    // viteConfig: '../vite.config.ts',
  },
  clients: [
    {
      scope: 'root',
      app: async () => await import('./app'),
      points: async () => await import('./lib/points.client'),
      routes: async () => await import('./lib/routes'),
      generate: [
        {
          what: 'points',
          outfile: './lib/points.client.ts',
        },
        {
          what: 'routes',
          outfile: './lib/routes.ts',
        },
      ],
      indexHtml: './index.html',
      outdir: '../dist/client',
      publicdir: { source: '../public', outdir: '../dist/client' },
      env: { vars: ['MY_ENV_FILE_VARIABLE'], consts: ['MY_ENV_FILE_CONSTANT'] },
      // port: client,
      // hmrPort: client,
      // viteConfig: '../vite.config.ts',
    },
  ],
})
