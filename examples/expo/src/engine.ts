import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx}'],
  portPolicy: 'kill',
  server: {
    scope: 'root',
    port: 3000,
    entry: { main: './index.server.ts' },
    generate: [
      {
        what: 'points',
        outfile: './lib/points.server.ts',
      },
    ],
    points: async () => await import('./lib/points.server'),
    outdir: '../dist/server',
  },
})
