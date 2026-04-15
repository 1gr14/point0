import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx}'],
  generate: { meta: './generated/point0/meta.ts' },
  server: {
    scope: 'root',
    port: 3000,
    entry: { main: './index.server.ts' },
    generate: { points: './generated/point0/points.server.ts' },
    points: async () => await import('./generated/point0/points.server'),
    devWatchGlob: ['**/*.{ts,tsx}', '!generated/point0/meta.ts'],
    outdir: '../dist/server',
  },
})
