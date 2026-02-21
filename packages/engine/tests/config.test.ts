import nodePath from 'node:path'
import { describe, expect, it } from 'bun:test'
import { parseEngineOptions } from '../src/config.js'

const base = ({
  general = {},
  server = {},
  clients = [],
}: {
  general?: Record<string, unknown>
  server?: Record<string, unknown>
  clients?: Array<Record<string, unknown>>
}) =>
  ({
    file: '/repo/src/engine.ts',
    cwdBeforeBuild: '/repo',
    cwdAfterBuild: '/repo/dist/server',
    ...general,
    server: {
      scope: 'server',
      ...server,
    },
    clients,
  }) as Parameters<typeof parseEngineOptions>[0]

describe('config', () => {
  describe('config parsing path resolution', () => {
    it('resolves relative paths from cwdBeforeBuild in non-built mode', () => {
      const parsed = parseEngineOptions(
        base({
          general: {
            itWasBuilt: false,
          },
          server: {
            outdir: './dist/server',
          },
        }),
      )

      expect(parsed.server.outdir).toBe('/repo/dist/server')
    })

    it('keeps non-relative paths as-is', () => {
      const parsed = parseEngineOptions(
        base({
          general: {
            itWasBuilt: false,
          },
          server: {
            outdir: '/already/absolute',
          },
        }),
      )

      expect(parsed.server.outdir).toBe('/already/absolute')
    })

    it('uses cwdAfterBuild when built and autoFixBuiltPaths is false', () => {
      const parsed = parseEngineOptions(
        base({
          general: {
            itWasBuilt: true,
            autoFixBuiltPaths: false,
            cwdBeforeBuild: '/repo',
            cwdAfterBuild: '/repo/build/server',
          },
          server: {
            outdir: './dist/server',
          },
        }),
      )

      expect(parsed.server.outdir).toBe('/repo/build/server/dist/server')
    })

    it('nulls relative vite config paths in built mode with autoFixBuiltPaths', () => {
      const parsed = parseEngineOptions(
        base({
          general: {
            itWasBuilt: true,
            autoFixBuiltPaths: true,
            cwdBeforeBuild: '/repo',
            cwdAfterBuild: '/repo/build/server',
            viteConfig: './vite.config.ts',
          },
          server: {
            viteConfig: './vite.server.config.ts',
          },
          clients: [
            {
              scope: 'web',
              viteConfig: './vite.client.config.ts',
            },
          ],
        }),
      )

      expect(parsed.general.viteConfig).toBeNull()
      expect(parsed.server.viteConfig).toBeNull()
      expect(parsed.clients[0].viteConfig).toBeNull()
    })

    it('rewrites built entry and client indexHtml paths to built locations', () => {
      const parsed = parseEngineOptions(
        base({
          general: {
            itWasBuilt: true,
            autoFixBuiltPaths: true,
            cwdBeforeBuild: '/repo',
            cwdAfterBuild: '/repo/build/server',
          },
          server: {
            outdir: './dist/server',
            entry: './src/server-entry.ts',
          },
          clients: [
            {
              scope: 'web',
              outdir: './dist/client',
              indexHtml: './src/index.html',
            },
          ],
        }),
      )

      expect(parsed.server.entry).toEqual({
        main: '/repo/dist/server/server-entry.js',
      })
      expect(parsed.clients[0].outdir).toBe('/repo/dist/client')
      expect(parsed.clients[0].indexHtml).toBe('/repo/dist/client/index.html')
      expect(nodePath.extname(parsed.server.entry?.main ?? '')).toBe('.js')
    })
  })
})
