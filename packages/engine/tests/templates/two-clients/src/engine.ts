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
      scope: 'first',
      app: async () => await import('./app.first'),
      points: async () => await import('./lib/points.first.client'),
      routes: async () => await import('./lib/routes.first'),
      generate: [
        {
          what: 'points',
          outfile: './lib/points.first.client.ts',
        },
        {
          what: 'routes',
          outfile: './lib/routes.first.client.ts',
        },
      ],
      indexHtml: './index.first.html',
      outdir: '../dist/client/first',
      publicdir: { source: '../public1', outdir: '../dist/client/first' },
      env: {
        vars: ['MY_ENV_FILE_VARIABLE', 'FIRST_CLIENT_ONLY_ENV_VAR'],
        consts: ['MY_ENV_FILE_CONSTANT', 'FIRST_CLIENT_ONLY_ENV_CONSTANT'],
      },
      // port: client1,
      // hmrPort: client1,
      // viteConfig1: '../vite.config.ts',
    },
    {
      scope: 'second',
      app: async () => await import('./app.second'),
      points: async () => await import('./lib/points.second.client'),
      routes: async () => await import('./lib/routes.second'),
      generate: [
        {
          what: 'points',
          outfile: './lib/points.second.client.ts',
        },
        {
          what: 'routes',
          outfile: './lib/routes.second.client.ts',
        },
      ],
      indexHtml: './index.second.html',
      outdir: '../dist/client/second',
      publicdir: { source: '../public2', outdir: '../dist/client/second' },
      env: {
        vars: ['MY_ENV_FILE_VARIABLE', 'SECOND_CLIENT_ONLY_ENV_VAR'],
        consts: ['MY_ENV_FILE_CONSTANT', 'SECOND_CLIENT_ONLY_ENV_CONSTANT'],
      },
      // port: client2,
      // hmrPort: client2,
      // viteConfig2: '../vite.config.ts',
    },
  ],
})
