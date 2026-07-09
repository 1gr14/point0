import { beforeAll, describe, expect, it } from 'bun:test'

// The native dev server ships compiler options to the spawned bun child over env vars. `POINT0_STATIC_COMPILER_OPTIONS`
// is a JSON.stringify — which silently turns *function* plugin refs in `compiler.markdown`/`compiler.babel` into `null`,
// breaking MDX compilation (empty `.mdx` modules, `page` export `undefined`). `POINT0_STATIC_COMPILER_REF` lets
// `bun-static` re-import the engine in-process and read those functions back. These tests pin the bug and the fix.

// `plugin/bun-static` builds a default plugin from env at import time, so seed a minimal options blob and import the
// named resolver dynamically (after the env is set) to unit-test it in isolation.
let resolveStaticCompilerOptions: (typeof import('../src/plugin/bun-static.js'))['resolveStaticCompilerOptions']

beforeAll(async () => {
  process.env.POINT0_STATIC_COMPILER_OPTIONS = JSON.stringify({ side: 'client', scope: 'root' })
  ;({ resolveStaticCompilerOptions } = await import('../src/plugin/bun-static.js'))
})

describe('resolveStaticCompilerOptions', () => {
  const rehypePlugin = () => (_tree: unknown) => {}
  const fakeEngineWithPlugin = (clientIndex: number) => ({
    clients: Array.from({ length: clientIndex + 1 }, (_v, i) =>
      i === clientIndex
        ? {
            compiler: { markdown: { rehypePlugins: [rehypePlugin], remarkPlugins: [], recmaPlugins: [] } },
            getCompilerOptions: ({ built }: { built?: boolean }) => ({
              side: 'client' as const,
              scope: 'root',
              built,
              markdown: { rehypePlugins: [rehypePlugin] },
            }),
          }
        : { compiler: false as const, getCompilerOptions: () => false as const },
    ),
  })

  it('JSON.stringify drops function plugins to null (the bug being fixed)', () => {
    const realOptions = { side: 'client', scope: 'root', markdown: { rehypePlugins: [rehypePlugin] } }
    const roundTripped = JSON.parse(JSON.stringify(realOptions))
    expect(roundTripped.markdown.rehypePlugins[0]).toBeNull()
  })

  it('re-attaches function markdown plugins from the engine ref over the JSON base', async () => {
    const optionsJson = JSON.stringify({
      side: 'client',
      scope: 'root',
      consts: [{ POINT0_SIDE: 'client' }],
      markdown: { rehypePlugins: [rehypePlugin], remarkPlugins: [], recmaPlugins: [] },
    })
    const refJson = JSON.stringify({ engineFile: '/fake/engine.ts', clientIndex: 0, built: false })

    const resolved = await resolveStaticCompilerOptions({
      optionsJson,
      refJson,
      loadEngine: async () => fakeEngineWithPlugin(0),
    })

    // Function restored, and the env-resolved fields from the JSON base are preserved.
    expect(resolved.markdown?.rehypePlugins?.[0]).toBe(rehypePlugin)
    expect(resolved.consts).toEqual([{ POINT0_SIDE: 'client' }])
  })

  it('targets the client at clientIndex', async () => {
    const optionsJson = JSON.stringify({ side: 'client', scope: 'root', markdown: { rehypePlugins: [null] } })
    const refJson = JSON.stringify({ engineFile: '/fake/engine.ts', clientIndex: 2, built: false })

    const resolved = await resolveStaticCompilerOptions({
      optionsJson,
      refJson,
      loadEngine: async () => fakeEngineWithPlugin(2),
    })

    expect(resolved.markdown?.rehypePlugins?.[0]).toBe(rehypePlugin)
  })

  it('uses the JSON options as-is when no ref is provided', async () => {
    const optionsJson = JSON.stringify({ side: 'client', scope: 'root' })
    const resolved = await resolveStaticCompilerOptions({ optionsJson, refJson: undefined })
    expect(resolved.scope).toBe('root')
  })

  it('reconstructs the full options from the ref when there is no JSON base', async () => {
    const refJson = JSON.stringify({ engineFile: '/fake/engine.ts', clientIndex: 0, built: true })
    const resolved = await resolveStaticCompilerOptions({
      optionsJson: undefined,
      refJson,
      loadEngine: async () => fakeEngineWithPlugin(0),
    })
    expect(resolved.markdown?.rehypePlugins?.[0]).toBe(rehypePlugin)
    expect((resolved as { built?: boolean }).built).toBe(true)
  })

  it('throws when neither options nor a usable ref is provided', async () => {
    await expect(resolveStaticCompilerOptions({ optionsJson: undefined, refJson: undefined })).rejects.toThrow()
  })
})
