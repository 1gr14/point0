import nodePath from 'node:path'
import { describe, expect, it } from 'bun:test'
import { parseEngineOptions } from '../src/config.js'

// Config returns native absolute paths (it's an fs-path resolver — see dev/docs/windows.md). `p()` pushes a posix
// fixture to the platform's native form so expectations match on every OS (identity on posix, `C:\repo\…` on Windows).
const p = (posixAbs: string): string => nodePath.resolve(posixAbs)

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

      expect(parsed.server.outdir).toBe(p('/repo/dist/server'))
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

      expect(parsed.server.outdir).toBe(p('/repo/build/server/dist/server'))
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
        main: p('/repo/dist/server/server-entry.js'),
      })
      expect(parsed.clients[0].outdir).toBe(p('/repo/dist/client'))
      expect(parsed.clients[0].indexHtml).toBe(p('/repo/dist/client/index.html'))
      expect(nodePath.extname(parsed.server.entry?.main ?? '')).toBe('.js')
    })
  })

  describe('compiler shortcuts', () => {
    it('returns false for server.compiler when general is false and server is undefined', () => {
      const parsed = parseEngineOptions(base({ general: { compiler: false } }))
      expect(parsed.server.compiler).toBe(false)
    })

    it('returns merged record when server.compiler is undefined and general.compiler is an object', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: { cache: false, consts: 'NODE_ENV' } },
        }),
      )
      expect(parsed.server.compiler).not.toBe(false)
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.cache).toBe(false)
      // String const names stay as strings in the normalized array — resolution to actual
      // process.env values happens later in Compiler.fixedConsts. The trailing {} comes from
      // the unconditional env.consts merge.
      expect(parsed.server.compiler.consts).toEqual(['NODE_ENV', {}])
    })

    it('returns the true-shortcut shape but still inherits general consts/markdown/babel', () => {
      const parsed = parseEngineOptions(
        base({
          general: {
            compiler: {
              consts: 'NODE_ENV',
              markdown: { remarkPlugins: ['remark-gfm'] },
              babel: ['babel-plugin-react-compiler'],
            },
          },
          server: { compiler: true },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.side).toBe(true)
      expect(parsed.server.compiler.runtime).toBe(false)
      expect(parsed.server.compiler.os).toBe(false)
      expect(parsed.server.compiler.consts).toEqual(['NODE_ENV', {}])
      expect(parsed.server.compiler.markdown).toEqual({
        remarkPlugins: ['remark-gfm'],
        rehypePlugins: [],
        recmaPlugins: [],
      })
      expect(parsed.server.compiler.babel).toEqual({
        plugins: ['babel-plugin-react-compiler'],
        presets: [],
      })
    })

    it('server.compiler:false wins over general.compiler:object — no markdown/babel inherited', () => {
      const parsed = parseEngineOptions(
        base({
          general: {
            compiler: {
              markdown: { remarkPlugins: ['remark-gfm'] },
              babel: ['babel-plugin-react-compiler'],
            },
          },
          server: { compiler: false },
        }),
      )
      expect(parsed.server.compiler).toBe(false)
    })

    it('server.compiler:false wins even when general.compiler:true', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: true },
          server: { compiler: false },
        }),
      )
      expect(parsed.server.compiler).toBe(false)
    })
  })

  describe('compiler markdown layering', () => {
    it('concatenates remarkPlugins from general and server', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: { markdown: { remarkPlugins: ['remark-gfm'] } } },
          server: { compiler: { markdown: { remarkPlugins: ['remark-frontmatter'] } } },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.markdown?.remarkPlugins).toEqual(['remark-gfm', 'remark-frontmatter'])
    })

    it('concatenates rehypePlugins and recmaPlugins independently for client', () => {
      const parsed = parseEngineOptions(
        base({
          general: {
            compiler: {
              markdown: {
                rehypePlugins: ['rehype-slug'],
                recmaPlugins: ['recma-mdx-displayname'],
              },
            },
          },
          server: { scope: 'server' },
          clients: [
            {
              scope: 'web',
              compiler: { markdown: { rehypePlugins: ['rehype-autolink-headings'] } },
            },
          ],
        }),
      )
      if (parsed.clients[0].compiler === false) throw new Error('unreachable')
      expect(parsed.clients[0].compiler.markdown?.rehypePlugins).toEqual(['rehype-slug', 'rehype-autolink-headings'])
      expect(parsed.clients[0].compiler.markdown?.recmaPlugins).toEqual(['recma-mdx-displayname'])
      expect(parsed.clients[0].compiler.markdown?.remarkPlugins).toEqual([])
    })

    it('lets specific markdown scalar fields override general', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: { markdown: { format: 'mdx' } } },
          server: { compiler: { markdown: { format: 'md' } } },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.markdown?.format).toBe('md')
    })

    it('markdown stays undefined when neither general nor specific provide it', () => {
      const parsed = parseEngineOptions(base({ general: { compiler: { cache: true } } }))
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.markdown).toBeUndefined()
    })
  })

  describe('compiler babel layering', () => {
    it('accepts array shorthand and treats it as plugins', () => {
      const parsed = parseEngineOptions(
        base({
          server: { compiler: { babel: ['babel-plugin-react-compiler'] } },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.babel).toEqual({
        plugins: ['babel-plugin-react-compiler'],
        presets: [],
      })
    })

    it('concatenates plugins and presets across general and server', () => {
      const parsed = parseEngineOptions(
        base({
          general: {
            compiler: { babel: { plugins: ['general-plugin'], presets: ['general-preset'] } },
          },
          server: {
            compiler: { babel: { plugins: ['server-plugin'], presets: ['server-preset'] } },
          },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.babel).toEqual({
        plugins: ['general-plugin', 'server-plugin'],
        presets: ['general-preset', 'server-preset'],
      })
    })

    it('mixes array shorthand at general with object form at specific', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: { babel: ['general-plugin'] } },
          server: { compiler: { babel: { plugins: ['server-plugin'], presets: ['server-preset'] } } },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.babel).toEqual({
        plugins: ['general-plugin', 'server-plugin'],
        presets: ['server-preset'],
      })
    })

    it('client babel layers independently from server', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: { babel: ['shared-plugin'] } },
          server: { scope: 'server', compiler: { babel: ['server-only'] } },
          clients: [{ scope: 'web', compiler: { babel: ['client-only'] } }],
        }),
      )
      if (parsed.server.compiler === false || parsed.clients[0].compiler === false) {
        throw new Error('unreachable')
      }
      expect(parsed.server.compiler.babel?.plugins).toEqual(['shared-plugin', 'server-only'])
      expect(parsed.clients[0].compiler.babel?.plugins).toEqual(['shared-plugin', 'client-only'])
    })
  })

  describe('consts and env.consts layering', () => {
    it('concatenates compiler.consts from general and server in order (plus the trailing env.consts {})', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: { consts: { FROM_GENERAL: 'g' } } },
          server: { compiler: { consts: { FROM_SERVER: 's' } } },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      // env.consts defaults to {} and is always appended after compiler.consts.
      expect(parsed.server.compiler.consts).toEqual([{ FROM_GENERAL: 'g' }, { FROM_SERVER: 's' }, {}])
    })

    it('appends server env.consts onto compiler.consts after general+specific', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: { consts: { A: '1' } } },
          server: {
            compiler: { consts: { B: '2' } },
            env: { consts: { C: '3' } },
          },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.consts).toEqual([{ A: '1' }, { B: '2' }, { C: '3' }])
    })

    it('appends client env.consts onto compiler.consts after general+specific', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: { consts: { A: '1' } } },
          clients: [
            {
              scope: 'web',
              compiler: { consts: { B: '2' } },
              env: { consts: { C: '3' } },
            },
          ],
        }),
      )
      if (parsed.clients[0].compiler === false) throw new Error('unreachable')
      expect(parsed.clients[0].compiler.consts).toEqual([{ A: '1' }, { B: '2' }, { C: '3' }])
    })
  })

  describe('compiler importer cwd defaulting', () => {
    it('defaults compiler.importer.cwd to engine cwd when no importer is given', () => {
      const parsed = parseEngineOptions(base({ general: { compiler: {} } }))
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.importer.cwd).toBe('/repo')
    })

    it('uses server.importer (top-level) as compiler.importer when compiler.importer is unset', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: {} },
          server: { importer: { deny: ['secret-pkg'] } },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.importer.deny).toEqual(['secret-pkg'])
      expect(parsed.server.compiler.importer.cwd).toBe('/repo')
    })

    it('prefers compiler.importer over server.importer when both are present', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: {} },
          server: {
            importer: { deny: ['from-top'] },
            compiler: { importer: { deny: ['from-compiler'] } },
          },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.importer.deny).toEqual(['from-compiler'])
    })
  })

  describe('compiler assets layering', () => {
    it('defaults assets ON (enabled with defaults) when the compiler is on and no `assets` is given', () => {
      const parsed = parseEngineOptions(base({ general: { compiler: {} } }))
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.assets).toEqual({ extensions: undefined, defaultMode: undefined, svgr: undefined })
    })

    it('uses the general top-level `assets` as compiler.assets when the compiler is enabled', () => {
      const parsed = parseEngineOptions(base({ general: { compiler: {}, assets: { defaultMode: 'file' } } }))
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.assets).toEqual({ extensions: undefined, defaultMode: 'file', svgr: undefined })
    })

    it('uses the per-side top-level `assets` as compiler.assets', () => {
      const parsed = parseEngineOptions(
        base({ general: { compiler: {} }, server: { assets: { extensions: ['png'] } } }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.assets).toEqual({ extensions: ['png'], defaultMode: undefined, svgr: undefined })
    })

    it('prefers compiler.assets over the per-side top-level `assets`', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: {} },
          server: { assets: { defaultMode: 'url' }, compiler: { assets: { defaultMode: 'file' } } },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.assets).toEqual({ extensions: undefined, defaultMode: 'file', svgr: undefined })
    })

    it('keeps the per-side top-level `assets` independent per client', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: {} },
          clients: [{ scope: 'a', assets: { defaultMode: 'file' } }, { scope: 'b' }],
        }),
      )
      if (parsed.clients[0].compiler === false || parsed.clients[1].compiler === false) throw new Error('unreachable')
      expect(parsed.clients[0].compiler.assets).toEqual({ extensions: undefined, defaultMode: 'file', svgr: undefined })
      expect(parsed.clients[1].compiler.assets).toEqual({
        extensions: undefined,
        defaultMode: undefined,
        svgr: undefined,
      })
    })

    it('merges the general top-level with a per-side override field-by-field (specific wins)', () => {
      const parsed = parseEngineOptions(
        base({
          general: { compiler: {}, assets: { extensions: ['png', 'svg'], defaultMode: 'url' } },
          server: { assets: { defaultMode: 'file' } },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.assets).toEqual({
        extensions: ['png', 'svg'],
        defaultMode: 'file',
        svgr: undefined,
      })
    })

    it('top-level `assets: false` disables the pipeline for that side (compiler still on)', () => {
      const parsed = parseEngineOptions(base({ general: { compiler: {} }, server: { assets: false } }))
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.assets).toBe(false)
    })

    it('`defaultMode: false` survives the merge — distinct from `assets: false` (pipeline ON, bare goes native)', () => {
      const parsed = parseEngineOptions(base({ general: { compiler: {}, assets: { defaultMode: false } } }))
      if (parsed.server.compiler === false) throw new Error('unreachable')
      // NOT `false` (that disables the whole pipeline) — the pipeline stays on, only the bare default is opted out, so
      // the explicit `?url`/`?file`/`?text`/`?react` forms still resolve and the generator omits only the bare d.ts.
      expect(parsed.server.compiler.assets).toEqual({ extensions: undefined, defaultMode: false, svgr: undefined })
    })
  })

  describe('ssr resolution', () => {
    it('defaults to false when nothing is provided', () => {
      const parsed = parseEngineOptions(base({}))
      expect(parsed.server.ssr).toBe(false)
    })

    it('uses general.ssr when server.ssr is not set', () => {
      const parsed = parseEngineOptions(base({ general: { ssr: true } }))
      expect(parsed.server.ssr).toBe(true)
    })

    it('server.ssr wins over general.ssr', () => {
      const parsed = parseEngineOptions(
        base({
          general: { ssr: true },
          server: { ssr: false },
        }),
      )
      expect(parsed.server.ssr).toBe(false)
    })

    it('compiler.ssr at specific level wins for the compiler record', () => {
      const parsed = parseEngineOptions(
        base({
          general: { ssr: false },
          server: { compiler: { ssr: true } },
        }),
      )
      if (parsed.server.compiler === false) throw new Error('unreachable')
      expect(parsed.server.compiler.ssr).toBe(true)
    })
  })

  describe('client shorthand', () => {
    it('treats `client: {...}` the same as a single-element `clients: [{...}]`', () => {
      const withShorthand = parseEngineOptions(
        base({ general: { compiler: {} } }) as unknown as Parameters<typeof parseEngineOptions>[0] & {
          client: unknown
        },
      )
      // The shorthand actually needs to be passed; test using clients explicitly first.
      const explicit = parseEngineOptions({
        ...(base({ general: { compiler: {} } }) as any),
        clients: [{ scope: 'web' }],
      })
      const shorthand = parseEngineOptions({
        ...(base({ general: { compiler: {} } }) as any),
        client: { scope: 'web' },
      })
      expect(shorthand.clients.length).toBe(1)
      expect(shorthand.clients[0].scope).toBe('web')
      expect(explicit.clients[0].scope).toBe('web')
      // Suppress lint by referencing withShorthand
      void withShorthand
    })

    it('places `client: {...}` before items from `clients: [...]`', () => {
      const parsed = parseEngineOptions({
        ...(base({ general: { compiler: {} } }) as any),
        client: { scope: 'first' },
        clients: [{ scope: 'second' }],
      })
      expect(parsed.clients.map((c) => c.scope)).toEqual(['first', 'second'])
    })
  })

  describe('hmr port defaulting', () => {
    it('defaults server.hmrPort to server.port + 100', () => {
      const parsed = parseEngineOptions(base({ server: { port: 4000 } }))
      expect(parsed.server.hmrPort).toBe(4100)
    })

    it('honors explicit server.hmrPort: false', () => {
      const parsed = parseEngineOptions(base({ server: { hmrPort: false } }))
      expect(parsed.server.hmrPort).toBe(false)
    })

    it('client port defaults to server.port + index + 1, hmrPort to client.port + 100', () => {
      const parsed = parseEngineOptions(
        base({
          server: { port: 3000 },
          clients: [{ scope: 'a' }, { scope: 'b' }],
        }),
      )
      expect(parsed.clients[0].port).toBe(3001)
      expect(parsed.clients[0].hmrPort).toBe(3101)
      expect(parsed.clients[1].port).toBe(3002)
      expect(parsed.clients[1].hmrPort).toBe(3102)
    })
  })

  describe('publicdir parsing', () => {
    it('treats a bare string as a single entry mounted at /', () => {
      const parsed = parseEngineOptions(
        base({
          server: { publicdir: { source: './public', outdir: './dist/public' } },
        }),
      )
      expect(parsed.server.publicdir?.source).toEqual([['/', p('/repo/public')]])
    })

    it('expands an object map into multiple entries', () => {
      const parsed = parseEngineOptions(
        base({
          server: {
            publicdir: {
              source: { '/assets': './public/assets', '/static': './public/static' },
              outdir: './dist/public',
            },
          },
        }),
      )
      expect(parsed.server.publicdir?.source).toEqual([
        ['/assets', p('/repo/public/assets')],
        ['/static', p('/repo/public/static')],
      ])
    })

    it('expands a mixed array of strings, objects, and tuples', () => {
      const parsed = parseEngineOptions(
        base({
          server: {
            publicdir: {
              source: ['./public', { '/extra': './public/extra' }, ['/foo', './public/foo']],
              outdir: './dist/public',
            },
          },
        }),
      )
      expect(parsed.server.publicdir?.source).toEqual([
        ['/', p('/repo/public')],
        ['/extra', p('/repo/public/extra')],
        ['/foo', p('/repo/public/foo')],
      ])
    })

    it('returns null publicdir when outdir is missing', () => {
      const parsed = parseEngineOptions(
        base({
          server: { publicdir: { source: './public' } as unknown as never },
        }),
      )
      expect(parsed.server.publicdir).toBeNull()
    })
  })

  describe('env vars parsing', () => {
    it('throws when a client tries to use the empty-string env key', () => {
      expect(() =>
        parseEngineOptions(
          base({
            clients: [{ scope: 'web', env: { vars: '' } }],
          }),
        ),
      ).toThrow(/Environment variable/)
    })

    it('throws when a client tries to use the "*" wildcard for env.vars', () => {
      expect(() =>
        parseEngineOptions(
          base({
            clients: [{ scope: 'web', env: { vars: '*' } }],
          }),
        ),
      ).toThrow(/Environment variable/)
    })

    it('parses an object form of env.consts into the parsed map', () => {
      const parsed = parseEngineOptions(
        base({
          server: { env: { consts: { MY_CONST: 'value' } } },
        }),
      )
      expect(parsed.server.envConsts).toEqual({ MY_CONST: 'value' })
    })
  })

  describe('logger', () => {
    const sampleLog = { level: 'info' as const, category: ['test'], message: 'hi' }

    it('uses logger.log directly when given the object form', () => {
      const calls: string[] = []
      const parsed = parseEngineOptions(base({ general: { logger: { log: () => calls.push('x') } } }))
      parsed.general.log(sampleLog)
      expect(calls).toEqual(['x'])
    })

    it('carries the function form raw (resolved later in preload, after bun plugins)', () => {
      const fn = () => ({ log: () => {} })
      const parsed = parseEngineOptions(base({ general: { logger: fn } }))
      // not resolved at parse time: the raw function is carried, and log stays the default until preload
      expect(parsed.general.logger).toBe(fn)
      expect(() => parsed.general.log(sampleLog)).not.toThrow()
    })
  })

  describe('ssr options', () => {
    it('general ssr options flow to each client as the default, filling in resolved defaults', () => {
      const parsed = parseEngineOptions(
        base({
          general: { ssr: { allowedDiscoveryRenders: 7, prefetchLoadersBeforePageRender: true } },
          clients: [{ scope: 'web' }],
        }),
      )
      expect(parsed.clients[0].ssrOptions).toEqual({
        allowedDiscoveryRenders: 7,
        forbiddenDiscoveryRenders: 25,
        prefetchLoadersBeforePageRender: true,
      })
    })

    it('client-level ssr options override the general default per client', () => {
      const parsed = parseEngineOptions(
        base({
          general: { ssr: { allowedDiscoveryRenders: 7 } },
          clients: [{ scope: 'web', ssr: { allowedDiscoveryRenders: 1 } }, { scope: 'mobile' }],
        }),
      )
      // web overrides allowedDiscoveryRenders, keeps the forbidden default
      expect(parsed.clients[0].ssrOptions.allowedDiscoveryRenders).toBe(1)
      expect(parsed.clients[0].ssrOptions.forbiddenDiscoveryRenders).toBe(25)
      // mobile inherits the general default
      expect(parsed.clients[1].ssrOptions.allowedDiscoveryRenders).toBe(7)
    })
  })

  describe('generate scopes', () => {
    it('flattens the server and every client scope into the general generate tasks', () => {
      // Regression: the client scopes used to enter the list as one NESTED array element, so a downstream
      // `task.scopes.includes(scope)` silently dropped every point of a client scope that differs from the
      // server's (masked in single-scope projects, where the matching server scope stands on its own).
      const parsed = parseEngineOptions(
        base({
          general: { generate: { meta: './src/generated/meta.ts' } },
          clients: [{ scope: 'web' }, { scope: 'mobile' }],
        }),
      )
      const metaTask = parsed.general.generate.find((task) => task.what === 'meta')
      expect(metaTask).toBeDefined()
      expect((metaTask as { scopes: string[] }).scopes).toEqual(['server', 'web', 'mobile'])
    })
  })
})
