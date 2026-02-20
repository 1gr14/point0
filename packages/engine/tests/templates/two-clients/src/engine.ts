import { Engine } from '@point0/engine'
export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx}'],
  serveRetries: 99,
  portPolicy: 'kill',
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
    // host: server,
    // port: server,
    // hmrPort: server,
    // viteConfig: '../vite.config.ts',
  },
  clients: [
    {
      scope: 'first',
      app: async () => await import('./app1'),
      points: async () => await import('./lib/points1'),
      routes: async () => await import('./lib/routes1'),
      generate: [
        {
          what: 'points',
          outfile: './lib/points1.ts',
        },
        {
          what: 'routes',
          outfile: './lib/routes1.ts',
        },
      ],
      indexHtml: './index1.html',
      outdir: '../dist/client/first',
      publicdir: { source: '../public1', outdir: '../dist/client/first' },
      env: {
        vars: ['MY_ENV_FILE_VARIABLE', 'FIRST_CLIENT_ONLY_ENV_VAR'],
        consts: ['MY_ENV_FILE_CONSTANT', 'FIRST_CLIENT_ONLY_ENV_CONSTANT'],
      },
      // host: client1,
      // port: client1,
      // hmrPort: client1,
      // viteConfig1: '../vite.config.ts',
    },
    {
      scope: 'second',
      app: async () => await import('./app2'),
      points: async () => await import('./lib/points2'),
      routes: async () => await import('./lib/routes2'),
      generate: [
        {
          what: 'points',
          outfile: './lib/points2.ts',
        },
        {
          what: 'routes',
          outfile: './lib/routes2.ts',
        },
      ],
      indexHtml: './index2.html',
      outdir: '../dist/client/second',
      publicdir: { source: '../public2', outdir: '../dist/client/second' },
      env: {
        vars: ['MY_ENV_FILE_VARIABLE', 'SECOND_CLIENT_ONLY_ENV_VAR'],
        consts: ['MY_ENV_FILE_CONSTANT', 'SECOND_CLIENT_ONLY_ENV_CONSTANT'],
      },
      // host: client2,
      // port: client2,
      // hmrPort: client2,
      // viteConfig2: '../vite.config.ts',
    },
  ],
})
